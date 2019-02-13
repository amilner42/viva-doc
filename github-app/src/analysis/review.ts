// Module for handling the generation of reviews.

import R from "ramda"

import * as Tag from "./tag-parser"


// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNewTag | ReviewDeletedTag | ReviewModifiedTag

// A tag can be new, deleted, or modified in some way.

export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export interface BaseReview {
  reviewType: ReviewType;
  tag: Tag.VdTag;
}

// A review for a new tag.
export type ReviewNewTag = BaseReview & {
  reviewType: "new";
  isNewFile: boolean;
}

// A review for a deleted tag.
export type ReviewDeletedTag = BaseReview & {
  reviewType: "deleted";
  isDeletedFile: boolean;
}

/** A review for a modified tag.

  Modifications include any/all of the following: changing the tag, changing some code, changing the docs.
*/
export type ReviewModifiedTag = BaseReview & {
  reviewType: "existing";
  modifiedTag: boolean;
  modifiedCode: boolean;
  modifiedDocs: boolean;
}

// Get reviews from all the parsed information
export const getReviews = (diffWFAT: Tag.DiffWithFilesAndTags) => {

  switch ( diffWFAT.diffType ) {

    case "new":

      return R.map<Tag.VdTag, Review>((fileTag) => {
        return {
          reviewType: "new",
          tag: fileTag,
          isNewFile: true
        }
      }, diffWFAT.fileTags)

    case "deleted":

      return R.map<Tag.VdTag, Review>((fileTag) => {
        return {
          reviewType: "deleted",
          tag: fileTag,
          isDeletedFile: true
        }
      }, diffWFAT.fileTags)

    case "renamed":
      throw new Error("NOT IMPLEMENETED YET")

    case "modified":
      throw new Error("NOT IMPLEMENETED YET")

  } // end switch

}
