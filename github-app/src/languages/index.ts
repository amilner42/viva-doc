// Module for access to all language-specific code.

import R from "ramda"

import * as AST from "./ast"
import * as Tag from "../tag"
import * as F from "../functional"

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


/** EXTERNAL FUNCTIONS */


export const getSupportedLanguageFromExtension = (extension: string): F.Maybe<Language> => {

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

  return null;
}


export const getLanguageFromFilePath = (filePath: string): F.Maybe<Language> => {

  const fileName: string = R.last(filePath.split("/")) as string;
  const nameSplitByPeriod = fileName.split(".");

  // In the future we may support things such as `Dockerfile` here.
  if (nameSplitByPeriod.length === 0) {
    return null;
  }

  const extension = R.last(nameSplitByPeriod) as string;

  return getSupportedLanguageFromExtension(extension);
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
