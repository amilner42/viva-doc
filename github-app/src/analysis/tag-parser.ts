// Module for handling parsing files for VD tags.

import R from "ramda"

import { ModifiedFileDiff, RenamedFileDiff, DeletedFileDiff, NewFileDiff } from "./diff-parser"
import { parseVdTags } from "./languages/index"

/** EXTERNAL TYPES */

// Adding the files for diffs that contain the full file
export type DiffWithFiles =
  ModifiedDiffWithFiles |
  RenamedDiffWithFiles |
  NewDiffWithFiles |
  DeletedDiffWithFiles


export type ModifiedDiffWithFiles = ModifiedFileDiff & {
  previousFileContent: string,
  fileContent: string
}

export type RenamedDiffWithFiles = RenamedFileDiff & {
  previousFileContent: string,
  fileContent: string
}

// The full file is present already in the diff itself
export type NewDiffWithFiles = NewFileDiff

// The full file is present already in the diff itself
export type DeletedDiffWithFiles = DeletedFileDiff

//
export type DiffWithFilesAndTags =
  ModifiedDiffWithFilesAndTags |
  RenamedDiffWithFilesAndTags |
  NewDiffWithFilesAndTags |
  DeletedDiffWithFilesAndTags

export type ModifiedDiffWithFilesAndTags = ModifiedDiffWithFiles & {
  previousFileTags: VdTag[];
  fileTags: VdTag[];
}

export type RenamedDiffWithFilesAndTags = RenamedDiffWithFiles & {
  previousFileTags: VdTag[];
  fileTags: VdTag[];
}

export type NewDiffWithFilesAndTags = NewDiffWithFiles & {
  fileTags: VdTag[];
}

export type DeletedDiffWithFilesAndTags= DeletedDiffWithFiles & {
  fileTags: VdTag[];
}

/** All possible VD tag types
 *
 * Tags are the core of VivaDoc, allowing the user to tag some documentation that they'd like to be responsible for.
 */
export type VdTag = VdFileTag | VdBlockTag | VdFunctionTag | VdLineTag

// All tag types.
export type VdTagType = "file" | "block" | "function" | "line"

// All tags should have these properties.
export interface BaseTag {
  tagType: VdTagType;
  owner: string;
}

// All tags that have line ownership should have these properties.
export interface LineOwnershipTag {
  startLine: number;
  endLine: number;
}

// A tag representing documentation ownership of an entire file.
export type VdFileTag = BaseTag & {
  tagType: "file";
}

// A tag representing documentation ownership of a function.
export type VdFunctionTag = BaseTag & LineOwnershipTag & {
  tagType: "function";
}

// A tag representing documentation ownership of a explicitly specified block.
export type VdBlockTag = BaseTag & LineOwnershipTag & {
  tagType: "block";
}

// A tag representing documentation ownership of a single line of code.
export type VdLineTag = BaseTag & LineOwnershipTag & {
  tagType: "line";
}

// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNewTag | ReviewDeletedTag | ReviewModifiedTag

// A tag can be new, deleted, or modified in some way.
export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export interface BaseReview {
  reviewType: ReviewType;
  tag: VdTag;
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

/** CONSTANTS */

const VD_TAG = "@VD"

/** EXTERNAL FUNCTIONS */

// TODO DOC
export const getFileReview = (diffWF: DiffWithFiles): Review[] => {

  const diffWFAT = parseVdTags(diffWF)

  switch ( diffWFAT.diffType ) {

    case "new":

      return R.map<VdTag, Review>((fileTag) => {
        return {
          reviewType: "new",
          tag: fileTag,
          isNewFile: true
        }
      }, diffWFAT.fileTags)

    case "deleted":

      return R.map<VdTag, Review>((fileTag) => {
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
