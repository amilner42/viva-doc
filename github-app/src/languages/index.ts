// Module for access to all language-specific code.

import R from "ramda"

import * as AST from "./ast"
import * as AppError from "../error"
import * as Tag from "../tag"

import * as c from "./c"
import * as cplusplus from "./cplusplus"
import * as header from "./header"
import * as java from "./java"
import * as javascript from "./javascript"
import * as typescript from "./typescript"


/** EXTERNAL TYPES */


// Enum of languages we support
export type Language
  = "C"
  | "CPlusPlus"
  | "Header"
  | "Java"
  | "Javascript"
  | "Typescript"


// All possible error types
export type LanguageParserErrorType = "unsupported-file" | "unsupported-extension"

export class LanguageParserError extends AppError.ProbotAppError {

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
    case "js":
      return "Javascript"

    case "ts":
      return "Typescript"

    case "java":
      return "Java"

    case "h":
      return "Header"

    case "cpp":
    case "cc":
      return "CPlusPlus"

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


/** Parse the AST from the file given the language. */
export const parse = (language: Language, fileContent: string): AST.ReducedFileAst => {

  switch (language) {

    case "Javascript":
      return javascript.parse(fileContent)

    case "Typescript":
      return typescript.parse(fileContent)

    case "Java":
      return java.parse(fileContent)

    case "CPlusPlus":
      return cplusplus.parse(fileContent)

    case "C":
      return c.parse(fileContent)

    case "Header":
      return header.parse(fileContent)

  }
}


// Converts a reduced ast to VD tags
export const astToTags =
  ( language: Language
  , reducedFileAst: AST.ReducedFileAst
  , fileContent: string
  ): Tag.VdTag[] => {

  switch (language) {

    case "Javascript":
      return javascript.astToTags(reducedFileAst, fileContent)

    case "Typescript":
      return typescript.astToTags(reducedFileAst, fileContent)

    case "Java":
      return java.astToTags(reducedFileAst, fileContent)

    case "CPlusPlus":
      return cplusplus.astToTags(reducedFileAst, fileContent)

    case "C":
      return c.astToTags(reducedFileAst, fileContent)

    case "Header":
      return header.astToTags(reducedFileAst, fileContent)

  }
}
