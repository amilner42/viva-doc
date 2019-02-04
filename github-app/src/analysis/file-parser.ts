// Module for handling parsing files for VD tags.

import { FileDiff } from "./diff-parser"
import { parseVdTags } from "./languages/index"

/** EXTERNAL TYPES */

export type File = ({ content: string[] } & FileDiff)

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
export const analyzeFile = (file: File): VdTagNeedingApproval[] => {

  // With no tags there's nothing to worry about
  if(!file.content.includes(VD_TAG)) {
    return []
  }

  // Otherwise we need to parse the file and extract the comment
  const vdTags: VdTag[] = parseVdTags(file)

  // TODO
  return getTagsNeedingApproval(vdTags)
}

/** INERNAL FUNCTIONS */

// TODO
const getTagsNeedingApproval = (vdTags: VdTag[]): VdTagNeedingApproval[] => {
  throw new Error("NOT IMPLEMENETED YET")
}
