// Module for handling the generation of reviews.

import R from "ramda"

import * as Diff from "./diff-parser"
import * as Tag from "./tag-parser"

/** EXTERNAL TYPES */

/** TODO DOC  */
export type FileReview = NewFileReview | DeletedFileReview | RenamedFileReview | ModifiedFileReview

/** TODO DOC */
export interface BaseFileReview {
  fileReviewType: "new-file" | "deleted-file" | "renamed-file" | "modified-file";
  reviews: Review[];
}

/** TODO DOC */
export interface HasSingleFilePath {
  filePath: string;
}

/** TODO DOC */
export type NewFileReview = BaseFileReview & HasSingleFilePath & {
  fileReviewType: "new-file";
  reviews: ReviewNew[];
}

/** TODO DOC */
export type DeletedFileReview = BaseFileReview & HasSingleFilePath & {
  fileReviewType: "deleted-file";
  reviews: ReviewDeleted[];
}

/** TODO DOC */
export type RenamedFileReview = BaseFileReview & {
  fileReviewType: "renamed-file";
  oldFilePath: string;
  newFilePath: string;
}

/** TODO DOC */
export type ModifiedFileReview = BaseFileReview & HasSingleFilePath & {
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

    case "new": {

      const reviews: ReviewNew[] = R.map<Tag.VdTag, ReviewNew>((fileTag) => {
        return {
          reviewType: "new",
          tag: fileTag,
        }
      }, diffWCAT.fileTags)

      return {
        fileReviewType: "new-file",
        filePath: diffWCAT.filePath,
        reviews
      }
    }

    case "deleted": {

      const reviews: ReviewDeleted[] = R.map<Tag.VdTag, ReviewDeleted>((fileTag) => {
        return {
          reviewType: "deleted",
          tag: fileTag
        }
      }, diffWCAT.fileTags)

      return {
        fileReviewType: "deleted-file",
        filePath: diffWCAT.filePath,
        reviews
      }
    }

    case "renamed": {

      const reviews: Review[] = calculateReviewsFromModification({
        oldTags: diffWCAT.previousFileTags,
        newTags: diffWCAT.fileTags,
        oldFileContent: diffWCAT.previousFileContent,
        newFileContent: diffWCAT.fileContent,
        alteredLines: diffWCAT.alteredLines
      })

      return {
        fileReviewType: "renamed-file",
        newFilePath: diffWCAT.newFilePath,
        oldFilePath: diffWCAT.filePath,
        reviews
      }
    }

    case "modified": {

      const reviews: Review[] = calculateReviewsFromModification({
        oldTags: diffWCAT.previousFileTags,
        newTags: diffWCAT.fileTags,
        oldFileContent: diffWCAT.previousFileContent,
        newFileContent: diffWCAT.fileContent,
        alteredLines: diffWCAT.alteredLines
      })

      return {
        fileReviewType: "modified-file",
        filePath: diffWCAT.filePath,
        reviews
      }
    }

  } // end switch
}

/** INTERNAL */

interface CalculateModificationReviewParams {
  oldTags: Tag.VdTag[],
  newTags: Tag.VdTag[],
  oldFileContent: string,
  newFileContent: string,
  alteredLines: Diff.AlteredLines
}

/** Calculates the reviews for some file modification given all helpful information.

  This is the crux of the app. Commit.
 */
const calculateReviewsFromModification = (params: CalculateModificationReviewParams): Review[] => {
  throw new Error("NOT IMPLEMENTED")
}
