// Module for handling the generation of reviews.

import R from "ramda"

import * as Tag from "./tag-parser"

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

// Get reviews from all the parsed information
export const getReviews = (diffWFAT: Tag.DiffWithFilesAndTags): FileReview => {

  switch ( diffWFAT.diffType ) {

    case "new": {

      const reviews: ReviewNew[] = R.map<Tag.VdTag, ReviewNew>((fileTag) => {
        return {
          reviewType: "new",
          tag: fileTag,
        }
      }, diffWFAT.fileTags)

      return {
        fileReviewType: "new-file",
        filePath: diffWFAT.filePath,
        reviews
      }
    }

    case "deleted": {

      const reviews: ReviewDeleted[] = R.map<Tag.VdTag, ReviewDeleted>((fileTag) => {
        return {
          reviewType: "deleted",
          tag: fileTag
        }
      }, diffWFAT.fileTags)

      return {
        fileReviewType: "deleted-file",
        filePath: diffWFAT.filePath,
        reviews
      }
    }

    case "renamed":
      throw new Error("NOT IMPLEMENETED YET")

    case "modified":
      throw new Error("NOT IMPLEMENETED YET")

  } // end switch

}
