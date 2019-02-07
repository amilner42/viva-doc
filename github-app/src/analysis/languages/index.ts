// Module representing the interface to all language-specific code

import R from "ramda"

import { ProbotAppError } from "../../error"
import { DiffWithFiles, VdTag, DiffWithFilesAndTags } from "../tag-parser"

// Language parsing imports
import * as cpp from "./cplusplus"
import * as javascript from "./javascript"
import * as java from "./java"
import * as python from "./python"
import * as typescript from "./typescript"

/** EXTERNAL TYPES */

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

// TODO
export interface FileParser {

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
  const fileParser: FileParser = getFileParser(language)

  switch (diffWF.diffType) {

    case "new": {

      const file =
        R.pipe(
          R.map(R.path(["content"])),
          R.join("\n")
        )(diffWF.alteredLines)

      return R.merge(
        diffWF,
        { fileTags: parseFile(fileParser, file )}
      )
    }

    case "deleted": {

      const file =
        R.pipe(
          R.map(R.path(["content"])),
          R.join("\n")
        )(diffWF.alteredLines)


      return R.merge(diffWF, { fileTags: parseFile(fileParser, file) })
    }

    case "renamed":
      return R.merge(
        diffWF,
        {
          fileTags: parseFile(fileParser, diffWF.fileContent),
          previousFileTags: parseFile(fileParser, diffWF.previousFileContent),
        }
      )

    case "modified":
      return R.merge(
        diffWF,
        {
          fileTags: parseFile(fileParser, diffWF.fileContent),
          previousFileTags: parseFile(fileParser, diffWF.previousFileContent)
        }
      )

  } // end switch
}

// Returns the file parser for the given language if it has been implemented.
// Work in progress...
const getFileParser = (language: Language): FileParser => {
  switch (language) {

    case "CPlusPlus":
      if (cpp.fileParser !== null) {
        return cpp.fileParser
      }

      throw new Error("NOT IMPLEMENTED")

    case "Java":
      if (java.fileParser !== null) {
        return java.fileParser
      }

      throw new Error("NOT IMPLEMENTED")

    case "Javascript":
      if (javascript.fileParser !== null) {
        return javascript.fileParser
      }

      throw new Error("NOT IMPLEMENTED")

    case "Python":
      if (python.fileParser !== null) {
        return python.fileParser
      }

      throw new Error("NOT IMPLEMENTED")

    case "Typescript":
      if (typescript.fileParser !== null) {
        return typescript.fileParser
      }

      throw new Error("NOT IMPLEMENTED")

  } // end switch
}


// The abstract part of parsing a file, using the file parser to do language-specific functions.
const parseFile = (fileParser: FileParser, file: String): VdTag[] => {

  throw new Error("NOT IMPLEMENTED")
}
