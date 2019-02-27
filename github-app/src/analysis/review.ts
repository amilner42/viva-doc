// Module for handling the generation of reviews.

import R from "ramda"

import * as LangUtil from "./languages/util"
import * as Diff from "./diff-parser"
import * as Tag from "./tag-parser"
import * as F from "../functional-types"

/** EXTERNAL TYPES */

/** TODO DOC  */
export type FileReview = NewFileReview | DeletedFileReview | RenamedFileReview | ModifiedFileReview

/** TODO DOC */
export interface BaseFileReview {
  fileReviewType: "new-file" | "deleted-file" | "renamed-file" | "modified-file";
  reviews: Review[];
}

/** TODO DOC */
export type NewFileReview = BaseFileReview & Diff.HasCurrentFilePath & {
  fileReviewType: "new-file";
  reviews: ReviewNew[];
}

/** TODO DOC */
export type DeletedFileReview = BaseFileReview & Diff.HasCurrentFilePath & {
  fileReviewType: "deleted-file";
  reviews: ReviewDeleted[];
}

/** TODO DOC */
export type RenamedFileReview = BaseFileReview & Diff.HasPreviousFilePath & Diff.HasCurrentFilePath & {
  fileReviewType: "renamed-file";
}

/** TODO DOC */
export type ModifiedFileReview = BaseFileReview & Diff.HasCurrentFilePath & {
  fileReviewType: "modified-file";
}

// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNew | ReviewDeleted | ReviewModified

// A tag can be new, deleted, or modified in some way.

export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export interface BaseReview {
  reviewType: ReviewType;
  tag: Tag.VdTag;
}

/** A review for a new tag. */
export type ReviewNew = BaseReview & {
  reviewType: "new";
}

/** A review for a deleted tag. */
export type ReviewDeleted = BaseReview & {
  reviewType: "deleted";
}

/** A review for a modified tag. */
export type ReviewModified = BaseReview & {
  reviewType: "modified";
}

/** EXTERNAL FUNCTIONS */

// Get reviews from all the parsed information
export const getReviews = (diffWCAT: Tag.FileDiffWithCodeAndTags): FileReview => {

  switch ( diffWCAT.diffType ) {

    case "new":
      // Simple case, all tags are new tags
      return {
        fileReviewType: "new-file",
        currentFilePath: diffWCAT.currentFilePath,
        reviews: mapTagsToNewReviews(diffWCAT.currentFileTags)
      }

    case "deleted":
      // Simple case, all tags are deleted tags
      return {
        fileReviewType: "deleted-file",
        currentFilePath: diffWCAT.currentFilePath,
        reviews: mapTagsToDeletedReviews(diffWCAT.currentFileTags)
      }

    case "renamed":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "renamed-file",
        currentFilePath: diffWCAT.currentFilePath,
        previousFilePath: diffWCAT.previousFilePath,
        reviews: calculateReviewsFromModification({
          previousTags: diffWCAT.previousFileTags,
          currentTags: diffWCAT.currentFileTags,
          previousFileContent: diffWCAT.previousFileContent,
          currentFileContent: diffWCAT.currentFileContent,
          alteredLines: diffWCAT.alteredLines
        })
      }

    case "modified":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "modified-file",
        currentFilePath: diffWCAT.currentFilePath,
        reviews: calculateReviewsFromModification({
          previousTags: diffWCAT.previousFileTags,
          currentTags: diffWCAT.currentFileTags,
          previousFileContent: diffWCAT.previousFileContent,
          currentFileContent: diffWCAT.currentFileContent,
          alteredLines: diffWCAT.alteredLines
        })
      }

  } // end switch
}

/** INTERNAL */

interface CalculateModificationReviewParams {
  previousTags: Tag.VdTag[],
  currentTags: Tag.VdTag[],
  previousFileContent: string,
  currentFileContent: string,
  alteredLines: Diff.LineDiff[]
}

/** Calculates the reviews for some file modification given all helpful information.

  This is the crux of the app. Commit.
 */
const calculateReviewsFromModification = (params: CalculateModificationReviewParams): Review[] => {

  /** Simple case: no old/new tags */
  if (params.previousTags.length === 0 && params.currentTags.length === 0) {
    return []
  }

  /** Simple case: no old tags, some new tags */
  if (params.previousTags.length === 0) {
    return mapTagsToNewReviews(params.currentTags)
  }

  /** Simple case: old tags, no new tags */
  if (params.currentTags.length === 0) {
    return mapTagsToDeletedReviews(params.previousTags)
  }

  /** Complex case: there are old/new tags, diff must be analyzed

    NOTE: The complex case is the common case.
  */
  const tagMap: TagMap = getTagMap(params.previousTags, params.currentTags, params.alteredLines)

  throw new Error("NOT IMPLEMENTED")
}

/** Create some `ReviewNew`s from some tags. */
const mapTagsToNewReviews = (tags: Tag.VdTag[]): ReviewNew[] => {
  return R.map<Tag.VdTag, ReviewNew>((tag) => {
    return { reviewType: "new", tag }
  }, tags)
}

/** Create some `ReviewDeleted`s from some tags. */
const mapTagsToDeletedReviews = (tags: Tag.VdTag[]): ReviewDeleted[] => {
  return R.map<Tag.VdTag, ReviewDeleted>((tag) => {
    return { reviewType: "deleted", tag }
  }, tags)
}

/** Helper for creating types with the TagMap structure. */
interface AbstractTagMap<A> {
  oldTagsToNewTags: A[];
  newTagsToOldTags: A[];
}

/** A map between old and new tags across a diff.

  `null` on `oldTagsToNewTags` represents that the old tag was deleted.
  `null` on `newTagsToOldTags` represents that the tag is new and doesn't match an old tag.
*/
type TagMap = AbstractTagMap<F.Maybe<number>>

/** Used while creating a tag map.

  The `undefined` is used during creation to represent a placeholder for some number, while `null` has the same meaning
  as in the `TagMap`. A `PartialTagMap` can be coverted to a `TagMap` by simply pairing all the `undefined` in one
  list with the `undefined` in the other list  [@refer `tagMapFromPartial`].

  NOTE: A `TagMapPartial` should have the same amount of `undefined` in each list.
*/
type TagMapPartial = AbstractTagMap<undefined | null>

/** Creates a map between the old tags and the new tags given the line diffs. */
const getTagMap = (oldTags: Tag.VdTag[], newTags: Tag.VdTag[], alteredLines: Diff.LineDiff[]): TagMap => {

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

        // TODO CONTINUE
        switch (alteredLine.type) {

          case "added":
            throw new Error("NOT IMPLEMENTED")

          case "deleted":
            throw new Error("NOT IMPLEMENTED")

        } // end switch

    } // end switch
  } // end for

  return tagMapFromPartial(partialTagMap)
}

/** Converts a `PartialTagMap` to a full `TagMap`

  Will throw an error if the `partialTagMap` is invalid.
    1. There must be the same amount of `undefined` tags in the `oldTagsToNewTags` as in `newTagsToOldTags`.
*/
const tagMapFromPartial = (partialTagMap: TagMapPartial): TagMap => {

  // Init all to `null`, will switch all `undefined` with the actual numbers.
  const tagMap: TagMap = {
    oldTagsToNewTags: R.repeat(null, partialTagMap.oldTagsToNewTags.length),
    newTagsToOldTags: R.repeat(null, partialTagMap.newTagsToOldTags.length)
  }

  const countUndefined = (list: any[]) => {
    return R.filter(R.equals(undefined), list).length
  }

  // Breaks rule 1
  if(countUndefined(partialTagMap.newTagsToOldTags) !== countUndefined(partialTagMap.oldTagsToNewTags)) {
    throw new Error("TODO")
  }

  let newTagIndex = 0

  // Otherwise we zip up matching tags
  for (let oldTagIndex = 0; oldTagIndex < partialTagMap.oldTagsToNewTags.length; oldTagIndex++) {

    // Already assigned value, go to next oldTagIndex
    if (partialTagMap.oldTagsToNewTags[oldTagIndex] !== undefined) { continue; }

    // Get the next newTagIndex pointing to an `undefined`
    while (partialTagMap.newTagsToOldTags[newTagIndex] !== undefined) { newTagIndex++ }

    // Add them to the map
    tagMap.oldTagsToNewTags[oldTagIndex] = newTagIndex
    tagMap.newTagsToOldTags[newTagIndex] = oldTagIndex
  }

  return tagMap
}
