// Module representing the interface to all language-specific code

import { AnalysisError } from "../error"

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

export const extractFileType = (fileName: string): Language => {

  const [ , extension ] = fileName.split(".")

  if (extension === undefined) {
    throw new LanguageParserError("unsupported-file", `File name is currently unsupported: ${fileName}`)
  }

  return getLanguage(extension)
}
