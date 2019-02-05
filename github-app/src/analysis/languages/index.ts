// Module representing the interface to all language-specific code

import R from "ramda"

import { AnalysisError } from "../error"
import { AnalyzeFileParams, VdTag } from "../tag-parser"
import * as javascript from "./javascript"

/** EXTERNAL TYPES */

// Enum of languages we support
export type Language = "Javascript"

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

export const getLanguage = (extension: string): Language => {
  switch(extension) {
    case "js":
      return "Javascript"
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

    case "Javascript":
      return javascript.parseVdTags(params)
  }

}
