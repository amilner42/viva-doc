// Module for handling parsing files for VD tags.

import { ModifiedFileDiff, RenamedFileDiff, DeletedFileDiff, NewFileDiff } from "./diff-parser"
import { parseVdTags } from "./languages/index"

/** EXTERNAL TYPES */

export type AnalyzeFileParams =
  { type: "modified", previousFileContent: string, fileContent: string, diff: ModifiedFileDiff } |
  { type: "renamed", previousFileContent: string, fileContent: string, diff: RenamedFileDiff } |
  { type: "new", diff: NewFileDiff } |
  { type: "deleted", diff: DeletedFileDiff }


/** All possible VD tag types
 *
 * Tags are the core of VivaDoc, allowing the user to tag some documentation that they'd like to be responsible for.
 */
export type VdTag = VdFileTag | VdBlockTag | VdFunctionTag | VdLineTag

// All tag types.
export type VdTagType = "file" | "block" | "function" | "line"

// All tags should have these properties.
export interface BaseTag {
  type: VdTagType;
  vdTagLineNumber: number;
  owner: string;
}

// All tags that have line ownership should have these properties.
export interface LineOwnershipTag {
  startLineNumber: number;
  endLineNumber: number;
}

// A tag representing documentation ownership of an entire file.
export type VdFileTag = BaseTag & {
  type: "file";
}

// A tag representing documentation ownership of a function.
export type VdFunctionTag = BaseTag & LineOwnershipTag & {
  type: "function";
}

// A tag representing documentation ownership of a explicitly specified block.
export type VdBlockTag = BaseTag & LineOwnershipTag & {
  type: "block";
}

// A tag representing documentation ownership of a single line of code.
export type VdLineTag = BaseTag & LineOwnershipTag & {
  type: "line";
}

// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNewTag | ReviewDeletedTag | ReviewModifiedTag

// A tag can be new, deleted, or modified in some way.
export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export interface BaseReview {
  type: ReviewType;
  tagType: VdTagType;
}

// A review for a new tag.
export type ReviewNewTag = BaseReview & {
  type: "new";
  isNewFile: boolean;
  content: string[];
}

// A review for a deleted tag.
export type ReviewDeletedTag = BaseReview & {
  type: "deleted";
  isDeletedFile: boolean;
  content: string[];
}

/** A review for a modified tag.

  Modifications include any/all of the following: changing the tag, changing some code, changing the docs.
*/
export type ReviewModifiedTag = BaseReview & {
  type: "existing";
  modifiedTag: boolean;
  modifiedCode: boolean;
  modifiedDocs: boolean;
}

/** CONSTANTS */

const VD_TAG = "@VD"

/** EXTERNAL FUNCTIONS */

// Returns all line numbers of @VD tags that need to be approved.
export const analyzeFile = (params: AnalyzeFileParams): Review[] => {

  throw new Error("NOT IMPLEMENETED YET")
}
