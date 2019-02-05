// Module representing the interface to all language-specific code

import R from "ramda"

import { AnalysisError } from "../index"
import { AnalyzeFileParams, VdTag } from "../tag-parser"

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

export class LanguageParserError extends AnalysisError {

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

// Parses the tags based on the langauge of the file
export const parseVdTags = (params: AnalyzeFileParams): VdTag[] => {

  // TODO what about the case where the language changes on a "rename"?
  const language = extractFileType(params.diff.filePath)

  switch (language) {

    case "CPlusPlus":
      return cpp.parseVdTags(params)

    case "Java":
      return java.parseVdTags(params)

    case "Javascript":
      return javascript.parseVdTags(params)

    case "Python":
      return python.parseVdTags(params)

    case "Typescript":
      return typescript.parseVdTags(params)

  }

}
