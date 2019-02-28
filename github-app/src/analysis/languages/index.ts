// Module for access to all language-specific code.

import R from "ramda"

import * as LangUtil from "./util"
import * as AppError from "../../error"
import * as Tag from "../tag-parser"

// Language parsing imports
import * as cpp from "./cplusplus/index"
import * as javascript from "./javascript/index"
import * as java from "./java/index"
import * as python from "./python/index"
import * as typescript from "./typescript/index"

/** EXTERNAL TYPES */

/** Language-agnostic AST parsed from file content containing all functions and comments.

  This AST does not contain the content of all nodes, only the line numbers. Only comments are parsed to capture the
  content for VD tag analysis, functions are lexed to ignore many characters - you must use the full files to retrieve
  the tag from the given line numbers.
 */
export interface FileAst {
  // All detected functions
  functions: {
    [ startLine: number]: FunctionNode[]
  };
  // All comments
  comments: {
    [ endLine: number ]: CommentNode[]
  };
}

export interface FunctionNode {
  startLine: number;
  endLine: number;
}

export interface CommentNode {
  startLine: number;
  endLine: number;
  content: string;
}

// Language-agnostic AST slightly more specific than the `FileAst` thereby making it easier to put algorithms on top
// of it related to VD.
export interface ReducedFileAst {
  // All functions detected in file
  functions: {
    [ startLine: number]: FunctionNode[]
  };

  // Only comments that are relevant to VD
  comments: {
    [ endLine: number ]: ReducedCommentNode
  };
}

/** A ReducedCommentNode must repreent a comment that has some VD information in it. */
export interface ReducedCommentNode {
  startLine: number;
  endLine: number;
  data:
    { dataType: "tag-declaration", owner: string, tagType: Tag.VdTagType, tagAnnotationLine: number } |
    { dataType: "tag-end-block", seen: boolean /** meta-data for whether it's been seen */ }
}

// Enum of languages we support
export type Language = "CPlusPlus" | "Java" | "Javascript" | "Python" | "Typescript"

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

export const newEmptyFileAst = (): FileAst => R.clone({ functions: {}, comments: {} })

export const newEmptyReducedFileAst = (): ReducedFileAst => R.clone({ functions: {}, comments: {} })

// Add a function to the AST
// @MODIFIES fileAst
export const addFunctionToAst = (fileAst: FileAst | ReducedFileAst, functionNode: FunctionNode): void => {
  if (fileAst.functions[functionNode.startLine] === undefined) {
    fileAst.functions[functionNode.startLine] = [ functionNode ]
    return
  }

  fileAst.functions[functionNode.startLine].push(functionNode)
}

// Add a comment to the AST
// @MODIFIES fileAst
export const addCommentToAst = (fileAst: FileAst, commentNode: CommentNode): void => {
  if (fileAst.comments[commentNode.endLine] === undefined) {
    fileAst.comments[commentNode.endLine] = [ commentNode ]
    return
  }

  fileAst.comments[commentNode.endLine].push(commentNode)
}

/** Parse the AST from the file given the language. */
export const parse = (language: Language, fileContent: string): FileAst => {

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

// Converts ast to VD tags
export const astToTags = (language: Language, fileAst: FileAst, fileContent: string): Tag.VdTag[] => {

  const reducedAst = LangUtil.reduceFileAst(fileAst)

  switch (language) {

    case "CPlusPlus":
      return cpp.astToTags(reducedAst, fileContent)

    case "Java":
      return java.astToTags(reducedAst, fileContent)

    case "Javascript":
      return javascript.astToTags(reducedAst, fileContent)

    case "Python":
      return python.astToTags(reducedAst, fileContent)

    case "Typescript":
      return typescript.astToTags(reducedAst, fileContent)

  } // end switch
}
