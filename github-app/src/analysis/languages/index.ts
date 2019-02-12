// Module representing the interface to all language-specific code

import R from "ramda"

import { ProbotAppError } from "../../error"
import { DiffWithFiles, VdTag, DiffWithFilesAndTags } from "../tag-parser"

// Language parsing imports
import * as cpp from "./cplusplus/index"
import * as javascript from "./javascript/index"
import * as java from "./java/index"
import * as python from "./python/index"
import * as typescript from "./typescript/index"

/** EXTERNAL TYPES */

// Language-agnostic AST parsed from file content.
export interface FileAST {
  functions: { fromLine: number; toLine: number; }[];
  comments: { fromLine: number; toLine: number; content: string; }[];
}

// Enum of languages we support
export type Language = "CPlusPlus" | "Java" | "Javascript" | "Python" | "Typescript"

// All possible error types
export type LanguageParserErrorType = "unsupported-file" | "unsupported-extension"

export class LanguageParserError extends ProbotAppError {

  public type: LanguageParserErrorType;

  constructor(type: LanguageParserErrorType, mssg?: string) {
    super(`Language Parser Error --- Type: ${type} , Optional Message: ${mssg}`)
    this.type = type
  }
}

/** EXTERNAL FUNCTIONS */

// TODO DOC
// TODO probably need the file content to get language as well for cases like SQL or c/c++ header files
export const getLanguage = (extension: string): Language => {
  switch(extension) {
    case "cc":
    case "cpp":
      return "CPlusPlus"

    case "java":
      return "Java"

    case "js":
      return "Javascript"

    case "py":
      return "Python"

    case "ts":
      return "Typescript"
  }

  throw new LanguageParserError("unsupported-extension", `No language for file extension: ${extension}`)
}

// Extract the language from the extension or throw an error if we don't support that language.
export const extractFileType = (filePath: string): Language => {

  const fileName: string = R.last(filePath.split("/")) as string
  const [ , extension ] = fileName.split(".")

  if (extension === undefined) {
    throw new LanguageParserError("unsupported-file", `File name is currently unsupported: ${fileName}`)
  }

  return getLanguage(extension)
}

// export type DiffWithFilesAndTags =

// Parses the tags based on the langauge of the file
export const parseVdTags = (diffWF: DiffWithFiles): DiffWithFilesAndTags => {

  // TODO what about the case where the language changes on a "rename"?
  const language = extractFileType(diffWF.filePath)

  const getFileTags = (fileContent: string): VdTag[] => {
    const fileAst = parse(language, fileContent)
    return astToTags(language, fileAst)
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

export const newEmptyFileAst = (): FileAST => R.clone({ functions: [], comments: [] })

/** INTERNAL FUNCTIONS */

/** Parse the AST from the file given the language. */
const parse = (language: Language, fileContent: string): FileAST => {

  switch (language) {

    case "CPlusPlus":
      return cpp.parse(fileContent)

    case "Java":
      return java.parse(fileContent)

    case "Javascript":
      return javascript.parse(fileContent)

    case "Python":
      return python.parse(fileContent)

    case "Typescript":
      return typescript.parse(fileContent)

  } // end switch
}

// Converts raw parsed data to VD tags
const astToTags = (language: Language, fileAst: FileAST): VdTag[] => {

  switch (language) {

    case "CPlusPlus":
      return cpp.astToTags(fileAst)

    case "Java":
      return java.astToTags(fileAst)

    case "Javascript":
      return javascript.astToTags(fileAst)

    case "Python":
      return python.astToTags(fileAst)

    case "Typescript":
      return typescript.astToTags(fileAst)

  } // end switch
}
