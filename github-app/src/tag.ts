// Module for handling tag related tasks

import R from "ramda"

import * as File from "./file"
import * as Diff from "./diff"
import * as F from "./functional"
import * as Lang from "./languages/index"

/** EXTERNAL TYPES */

/** COMPOSITION */

export interface HasCurrentTags {
  currentFileTags: VdTag[];
}

export interface HasPreviousTags {
  previousFileTags: VdTag[];
}

export interface HasAttachedCode {
  previousFileContent: string,
  currentFileContent: string
}

/** A diff with the code for the relevant file attached. */
export type FileDiffWithCode =
  ModifiedFileDiffWithCode |
  RenamedFileDiffWithCode |
  NewFileDiffWithCode |
  DeletedFileDiffWithCode

export type ModifiedFileDiffWithCode = Diff.ModifiedFileDiff & HasAttachedCode

export type RenamedFileDiffWithCode = Diff.RenamedFileDiff & HasAttachedCode

// The full file is present already in the diff itself
export type NewFileDiffWithCode = Diff.NewFileDiff

// The full file is present already in the diff itself
export type DeletedFileDiffWithCode = Diff.DeletedFileDiff

/** A diff with the code for the relevant file and parsed tags attached. */
export type FileDiffWithCodeAndTags =
  ModifiedFileDiffWithCodeAndTags |
  RenamedFileDiffWithCodeAndTags |
  NewFileDiffWithCodeAndTags |
  DeletedFileDiffWithCodeAndTags

export type ModifiedFileDiffWithCodeAndTags = ModifiedFileDiffWithCode & HasCurrentTags & HasPreviousTags

export type RenamedFileDiffWithCodeAndTags = RenamedFileDiffWithCode & HasCurrentTags & HasPreviousTags

export type NewFileDiffWithCodeAndTags = NewFileDiffWithCode & HasCurrentTags

export type DeletedFileDiffWithCodeAndTags= DeletedFileDiffWithCode & HasCurrentTags

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
  tagAnnotationLine: number;
  content: string[];
  startLine: number;
  endLine: number;
}

// A tag representing documentation ownership of an entire file.
export type VdFileTag = BaseTag & {
  tagType: "file";
}

// A tag representing documentation ownership of a function.
export type VdFunctionTag = BaseTag & {
  tagType: "function";
}

// A tag representing documentation ownership of a explicitly specified block.
export type VdBlockTag = BaseTag & {
  tagType: "block";
}

// A tag representing documentation ownership of a single line of code.
export type VdLineTag = BaseTag & {
  tagType: "line";
}

/** EXTERNAL FUNCTIONS */

/** Attach tags to a `FileDiffWithCode` object.

Note: This does not mutate the object you pass in, it creates a new object.
*/
export const parseTags = (diffWF: FileDiffWithCode): FileDiffWithCodeAndTags => {

  const currentLanguage = Lang.extractFileType(diffWF.currentFilePath)

  switch (diffWF.diffType) {

    case "new": {

      const file = File.mergeLinesIntoFileContent(diffWF.lines);

      return R.merge(diffWF, { currentFileTags: getFileTags(currentLanguage, file) })
    }

    case "deleted": {

      const file = File.mergeLinesIntoFileContent(diffWF.lines);

      return R.merge(diffWF, { currentFileTags: getFileTags(currentLanguage, file) })
    }

    case "renamed":
      const previousLanguage = Lang.extractFileType(diffWF.previousFilePath)

      return R.merge(
        diffWF,
        {
          currentFileTags: getFileTags(currentLanguage, diffWF.currentFileContent),
          previousFileTags: getFileTags(previousLanguage, diffWF.previousFileContent),
        }
      )

    case "modified":
      return R.merge(
        diffWF,
        {
          currentFileTags: getFileTags(currentLanguage, diffWF.currentFileContent),
          previousFileTags: getFileTags(currentLanguage, diffWF.previousFileContent)
        }
      )

  } // end switch
}

/** Get all the tags for a given file of a specific programming language. */
export const getFileTags = (language: Lang.Language, fileContent: string): VdTag[] => {
  const fileAst = Lang.parse(language, fileContent)
  return Lang.astToTags(language, fileAst, fileContent)
}

/** Retrieve the index tag from a list of tags based on the tag annotation line number.

  @throws A TODO error when there is more than one tag annotation on that line.
*/
export const getTagIndexFromAnnotationLine = (tags: VdTag[], tagAnnotationLine: number): F.Maybe<number> => {

  let index: F.Maybe<number> = null;

  for (let currentIndex = 0; currentIndex < tags.length; currentIndex++) {
    if (tags[currentIndex].tagAnnotationLine === tagAnnotationLine) {

      // First match
      if (index === null) {
        index = currentIndex;
        continue;
      }

      // Second match
      throw new Error("TODO: More than one match")
    }
  }

  return index;
}
