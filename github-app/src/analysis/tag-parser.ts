// Module for handling parsing files for VD tags.

import { ModifiedFileDiff, RenamedFileDiff, DeletedFileDiff, NewFileDiff } from "./diff-parser"
import { parseVdTags } from "./languages/index"

/** EXTERNAL TYPES */

export type AnalyzeFileParams =
  { type: "modified", previousFileContent: string, fileContent: string, diff: ModifiedFileDiff } |
  { type: "renamed", previousFileContent: string, fileContent: string, diff: RenamedFileDiff } |
  { type: "new", diff: NewFileDiff } |
  { type: "deleted", diff: DeletedFileDiff }


// All possible VD tag types
export type VdTag = VdFunctionTag
export type VdTagType = "function"
export type VdTagNeedingApproval = VdFunctionTagNeedingApproval

// Things that could require approval
export type FunctionTagApproval = {
  type: "code-change" | "doc-change" | "tag-change" | "new-tag",
  lineNumbers: number[]
}

// Function tags will be responsible for the lines that the function and the function comment
// take up.
export interface VdFunctionTag {
  type: "function";
  vdTagLineNumber: number;
  startLineNumber: number;
  endLineNumber: number;
  owner: string;
}

export type VdFunctionTagNeedingApproval = VdFunctionTag & {
  requiresApproval: FunctionTagApproval[];
}

/** CONSTANTS */

const VD_TAG = "@VD"

/** EXTERNAL FUNCTIONS */

// Returns all line numbers of @VD tags that need to be approved.
export const analyzeFile = (params: AnalyzeFileParams): VdTagNeedingApproval[] => {

  return getTagsNeedingApproval(params, parseVdTags(params))
}

/** INERNAL FUNCTIONS */

// TODO
const getTagsNeedingApproval = (params: AnalyzeFileParams, vdTags: VdTag[]): VdTagNeedingApproval[] => {

  throw new Error("NOT IMPLEMENETED YET")
}
