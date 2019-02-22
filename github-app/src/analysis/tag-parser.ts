// Module for handling parsing VD tags from files.

import R from "ramda"

import * as Diff from "./diff-parser"
import * as Lang from "./languages/index"

/** EXTERNAL TYPES */

/** A diff with the code for the relevant file attached. */
export type FileDiffWithCode =
  ModifiedFileDiffWithCode |
  RenamedFileDiffWithCode |
  NewFileDiffWithCode |
  DeletedFileDiffWithCode


export type ModifiedFileDiffWithCode = Diff.ModifiedFileDiff & {
  previousFileContent: string,
  fileContent: string
}

export type RenamedFileDiffWithCode = Diff.RenamedFileDiff & {
  previousFileContent: string,
  fileContent: string
}

// The full file is present already in the diff itself
export type NewFileDiffWithCode = Diff.NewFileDiff

// The full file is present already in the diff itself
export type DeletedFileDiffWithCode = Diff.DeletedFileDiff

/** TODO DOC */
export type FileDiffWithCodeAndTags =
  ModifiedFileDiffWithCodeAndTags |
  RenamedFileDiffWithCodeAndTags |
  NewFileDiffWithCodeAndTags |
  DeletedFileDiffWithCodeAndTags

export type ModifiedFileDiffWithCodeAndTags = ModifiedFileDiffWithCode & {
  previousFileTags: VdTag[];
  fileTags: VdTag[];
}

export type RenamedFileDiffWithCodeAndTags = RenamedFileDiffWithCode & {
  previousFileTags: VdTag[];
  fileTags: VdTag[];
}

export type NewFileDiffWithCodeAndTags = NewFileDiffWithCode & {
  fileTags: VdTag[];
}

export type DeletedFileDiffWithCodeAndTags= DeletedFileDiffWithCode & {
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

/** EXTERNAL FUNCTIONS */

// Parses the tags based on the langauge of the file
export const parseTags = (diffWF: FileDiffWithCode): FileDiffWithCodeAndTags => {

  // TODO what about the case where the language changes on a "rename"?
  const language = Lang.extractFileType(diffWF.filePath)

  const getFileTags = (fileContent: string): VdTag[] => {
    const fileAst = Lang.parse(language, fileContent)
    return Lang.astToTags(language, fileAst)
  }

  switch (diffWF.diffType) {

    case "new": {

      const file =
        R.pipe(
          R.map(R.path(["content"])),
          R.join("\n")
        )(diffWF.alteredLines)

      return R.merge(
        diffWF,
        { fileTags: getFileTags(file) }
      )
    }

    case "deleted": {

      const file =
        R.pipe(
          R.map(R.path(["content"])),
          R.join("\n")
        )(diffWF.alteredLines)


      return R.merge(diffWF, { fileTags: getFileTags(file) })
    }

    case "renamed":
      return R.merge(
        diffWF,
        {
          fileTags: getFileTags(diffWF.fileContent),
          previousFileTags: getFileTags(diffWF.previousFileContent),
        }
      )

    case "modified":
      return R.merge(
        diffWF,
        {
          fileTags: getFileTags(diffWF.fileContent),
          previousFileTags: getFileTags(diffWF.previousFileContent)
        }
      )

  } // end switch
}
