// Module for handling the generation of reviews.

import R from "ramda"

import * as LangUtil from "./languages/util"
import * as Diff from "./diff"
import * as Tag from "./tag"


/** EXTERNAL */

/** COMPOSITION TYPES */

export interface HasTags {
  tags: Tag.VdTag[];
}

export interface HasReviews {
  reviews: Review[];
}

/** The review needed for every file. */
export type FileReview = NewFileReview | DeletedFileReview | RenamedFileReview | ModifiedFileReview

export interface BaseFileReview {
  fileReviewType: "new-file" | "deleted-file" | "renamed-file" | "modified-file";
}

/** A new file review contains a list of tags because all tags in a new file are entirely new. */
export type NewFileReview = BaseFileReview & HasTags & Diff.HasCurrentFilePath & {
  fileReviewType: "new-file";
}

/** A deleted file review contains a list of tags because all tags in a deleted file are entirely deleted. */
export type DeletedFileReview = BaseFileReview & HasTags & Diff.HasCurrentFilePath & {
  fileReviewType: "deleted-file";
}

/** A renamed file `HasReviews` to specify exactly what needs review due to what changes. */
export type RenamedFileReview =
  BaseFileReview
  & Diff.HasPreviousFilePath
  & Diff.HasCurrentFilePath
  & HasReviews
  & {
  fileReviewType: "renamed-file";
}

/** A modified file `HasReviews` to specify exactly what needs review due to what changes. */
export type ModifiedFileReview =
  BaseFileReview
  & Diff.HasCurrentFilePath
  & HasReviews
  & {
  fileReviewType: "modified-file";
}

// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNewTag | ReviewDeletedTag | ReviewModifiedTag

// A tag can be new, deleted, or modified in some way.
export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export type BaseReview = {
  reviewType: ReviewType;
  tag: Tag.VdTag;
}

/** A `ReviewNew` is pointing to a newly created tag.

  The tag annotation would be a green line in the git diff.
  Because it's a new tag we don't include altered lines.
  */
export type ReviewNewTag = BaseReview & {
  reviewType: "new";
}

/** A `ReviewDeleted` is pointing to a deleted tag.

  The tag annotation would be a red line in the git diff.
  Because it's a deleted tag we don't include the altered lines.
 */
export type ReviewDeletedTag = BaseReview & {
  reviewType: "deleted";
}

/** A `ReviewModified` is pointing to a modified tag.

  The tag annotation would not be red or green in the git diff, only the code/comment changed.
  We include all altered lines that reflect the modification.
*/
export type ReviewModifiedTag = BaseReview & Diff.HasAlteredLines & {
  reviewType: "modified";
}

// Get reviews from all the parsed information
export const getReviews = (diffWCAT: Tag.FileDiffWithCodeAndTags): FileReview => {

  switch ( diffWCAT.diffType ) {

    case "new":
      // Simple case, all tags are new tags
      return {
        fileReviewType: "new-file",
        currentFilePath: diffWCAT.currentFilePath,
        tags: diffWCAT.currentFileTags
      }

    case "deleted":
      // Simple case, all tags are deleted tags
      return {
        fileReviewType: "deleted-file",
        currentFilePath: diffWCAT.currentFilePath,
        tags: diffWCAT.currentFileTags
      }

    case "renamed":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "renamed-file",
        currentFilePath: diffWCAT.currentFilePath,
        previousFilePath: diffWCAT.previousFilePath,
        reviews: calculateReviewsFromModification(
          diffWCAT.previousFileTags,
          diffWCAT.currentFileTags,
          diffWCAT.alteredLines
        )
      }

    case "modified":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "modified-file",
        currentFilePath: diffWCAT.currentFilePath,
        reviews: calculateReviewsFromModification(
          diffWCAT.previousFileTags,
          diffWCAT.currentFileTags,
          diffWCAT.alteredLines
        )
      }

  } // end switch
}

/** Calculates the reviews for some file modification given all helpful information.

  This is the core functionality of the app.
 */
export const calculateReviewsFromModification =
    ( previousTags: Tag.VdTag[]
    , currentTags: Tag.VdTag[]
    , alteredLines: Diff.AlteredLine[]
    ): Review[] => {

  if (previousTags.length === 0 && currentTags.length === 0) { return [] }

  const tagMap: TagMap = getTagMap(previousTags, currentTags, alteredLines)
  return reviewsFromTagMapAndAlteredLines(tagMap, alteredLines)
}

/** INTERNAL */

/** A map between old and new tags across a diff.
*/
type TagMap = {
  deletedTags: Tag.VdTag[],
  newTags: Tag.VdTag[],
  tagPairs: R.KeyValuePair<Tag.VdTag, Tag.VdTag>[]
}

/** Used while creating a tag map.

  - null in `oldTagsToNewTags` means that the tag was deleted.
  - null in `newTagsToOldTags` means the tag is new.
  - undefined means the tag wasn't deleted/added. It is partial because this data structure doesn't keep which tags map
  to each other, although it is simple to get that from this data structure by just zipping up the undefined in each
  list.

  NOTE: A `TagMapPartial` should have the same amount of `undefined` in each list.
*/
type TagMapPartial = {
  oldTagsToNewTags: (undefined | null)[];
  newTagsToOldTags: (undefined | null)[];
}

/** Creates a map between the old tags and the new tags given the line diffs. */
const getTagMap = (oldTags: Tag.VdTag[], newTags: Tag.VdTag[], alteredLines: Diff.AlteredLine[]): TagMap => {

  // Initialize tagMap to be entirely `null` for all entries.
  const partialTagMap: TagMapPartial = {
    oldTagsToNewTags: R.repeat(undefined, oldTags.length),
    newTagsToOldTags: R.repeat(undefined, newTags.length)
  }

  for (let alteredLine of alteredLines) {

    const matchTag = LangUtil.matchSingleVdTagAnnotation(alteredLine.content)

    switch (matchTag.branchTag) {

      // No VD annotation or just matched an end-block tag
      case "case-1":
      case "case-2":
        continue;

      // Matched a tag
      case "case-3":

        switch (alteredLine.type) {

          case "added":
            const indexOfNewTag = Tag.getTagIndexFromAnnotationLine(newTags, alteredLine.currentLineNumber)

            // TODO When would this happen
            if (indexOfNewTag === null) {
              throw new Error("TODO")
            }

            // Set that tag to be a new tag in the `partialTagMap`
            partialTagMap.newTagsToOldTags[indexOfNewTag] = null;
            continue;

          case "deleted":
            const indexOfDeletedTag = Tag.getTagIndexFromAnnotationLine(oldTags, alteredLine.previousLineNumber)

            // TODO When would this happen
            if (indexOfDeletedTag === null) {
              throw new Error("TODO")
            }

            // Set that tag to be a deleted tag in the `partialTagMap`
            partialTagMap.oldTagsToNewTags[indexOfDeletedTag] = null;
            continue;

        } // end switch

    } // end switch
  } // end for

  return tagMapFromPartial(partialTagMap, oldTags, newTags)
}

/** Converts a `PartialTagMap` to a full `TagMap`

  Will throw an error if the `partialTagMap` is invalid.
*/
const tagMapFromPartial =
    ( partialTagMap: TagMapPartial
    , previousTags: Tag.VdTag[]
    , currentTags: Tag.VdTag[]
    ): TagMap => {
    
  const tagMap: TagMap = {
    deletedTags: [],
    newTags: [],
    tagPairs: []
  }

  const countUndefined = (list: any[]) => {
    return R.filter(R.equals(undefined), list).length
  }

  // Invalid partial tag map
  if(countUndefined(partialTagMap.newTagsToOldTags) !== countUndefined(partialTagMap.oldTagsToNewTags)) {
    throw new Error("TODO")
  }

  // Add deleted tags to tag map
  for (let i = 0; i < previousTags.length; i++) {
    if (partialTagMap.oldTagsToNewTags[i] === null) {
      tagMap.deletedTags.push(previousTags[i])
    }
  }
  
  // Add new tags to tag map
  for (let i = 0; i < currentTags.length; i++) {
    if (partialTagMap.newTagsToOldTags[i] === null) {
      tagMap.newTags.push(currentTags[i])
    }
  }
  
  const getTagsThatPair = (partialTagMapPointers: (null | undefined)[], tags: Tag.VdTag[]): Tag.VdTag[] => {
    const zipped = R.zip(partialTagMapPointers, tags)
    const filterZipped = R.filter(([x, y]) => {
      return x === undefined
    }, zipped)
    return R.map(([x, y]) => y, filterZipped)
  }
  
  tagMap.tagPairs = R.zip(
    getTagsThatPair(partialTagMap.oldTagsToNewTags, previousTags),
    getTagsThatPair(partialTagMap.newTagsToOldTags, currentTags)
  )

  return tagMap
}

/** TODO DOC */
const reviewsFromTagMapAndAlteredLines = (tagMap: TagMap, alteredLines: Diff.AlteredLine[]): Review[] => {
  
  const reviewDeletedTags: ReviewDeletedTag[] = R.map<Tag.VdTag, ReviewDeletedTag>((tag) => {
    return {
      reviewType: "deleted",
      tag
    }
  }, tagMap.deletedTags)
  
  const reviewNewTags: ReviewNewTag[] = R.map<Tag.VdTag, ReviewNewTag>((tag) => {
    return {
      reviewType: "new",
      tag
    }
  }, tagMap.newTags)
  
  const tagPairsMaybeNeedingReview: ReviewModifiedTag[] = R.map((tagPair) => {
    return {
      reviewType: "modified",
      tag: tagPair[1],
      alteredLines: R.filter(alteredLineInTagPairOwnership(tagPair), alteredLines)
    } as ReviewModifiedTag
  }, tagMap.tagPairs)
  
  // Only keep tag pairs that have actually been modified
  const reviewModifiedTags = R.filter((reviewModifiedTag) => {
    return reviewModifiedTag.alteredLines.length > 0
  }, tagPairsMaybeNeedingReview)
  
  return ([] as Review[]).concat(reviewDeletedTags, reviewNewTags, reviewModifiedTags)
}

const alteredLineInTagPairOwnership = R.curry(
  ([previousTag, currentTag]: R.KeyValuePair<Tag.VdTag, Tag.VdTag>, alteredLine: Diff.AlteredLine): boolean => {
    
    switch (alteredLine.type) {
      
      case "added":
        return lineNumberInTagOwnership(currentTag, alteredLine.currentLineNumber)
      
      case "deleted":
        return lineNumberInTagOwnership(previousTag, alteredLine.previousLineNumber)
    }
  }
)

const lineNumberInTagOwnership = (tag: Tag.VdTag, lineNumber: number) => {
  return (lineNumber >= tag.startLine) && (lineNumber <= tag.endLine)
}
  
