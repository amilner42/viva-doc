// Module for access to all language-specific code.

import R from "ramda"

import * as AST from "./ast"
import * as Tag from "../tag"
import * as F from "../../functional"

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

export interface HasCurrentLanguage {
  currentLanguage: Language;
}

export interface HasPreviousLanguage {
  previousLanguage: Language;
}

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
export const parse = (language: Language, fileContent: string, filePath: string): AST.ReducedFileAst => {

  switch (language) {

    case "Javascript":
      return javascript.parse(fileContent, filePath);

    case "Typescript":
      return typescript.parse(fileContent, filePath);

    case "Java":
      return java.parse(fileContent, filePath);

    case "CPlusPlus":
      return cplusplus.parse(fileContent, filePath);

    case "C":
      return c.parse(fileContent, filePath);

    case "Header":
      return header.parse(fileContent, filePath);

  }
}


// Converts a reduced ast to VD tags
export const astToTags =
  ( language: Language
  , reducedFileAst: AST.ReducedFileAst
  , fileContent: string
  , filePath: string
  ): Tag.VdTag[] => {

  switch (language) {

    case "Javascript":
      return javascript.astToTags(reducedFileAst, fileContent, filePath)

    case "Typescript":
      return typescript.astToTags(reducedFileAst, fileContent, filePath)

    case "Java":
      return java.astToTags(reducedFileAst, fileContent, filePath)

    case "CPlusPlus":
      return cplusplus.astToTags(reducedFileAst, fileContent, filePath)

    case "C":
      return c.astToTags(reducedFileAst, fileContent, filePath)

    case "Header":
      return header.astToTags(reducedFileAst, fileContent, filePath)

  }
}
