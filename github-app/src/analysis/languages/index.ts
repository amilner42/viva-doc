// Module representing the interface to all language-specific code

import R from "ramda"

import { reduceFileAst } from "./util"
import { ProbotAppError } from "../../error"
import { DiffWithFiles, VdTag, VdTagType, DiffWithFilesAndTags } from "../tag-parser"

// Language parsing imports
import * as cpp from "./cplusplus/index"
import * as javascript from "./javascript/index"
import * as java from "./java/index"
import * as python from "./python/index"
import * as typescript from "./typescript/index"

/** EXTERNAL TYPES */

// Language-agnostic AST parsed from file content containing all functions and comments.
export interface FileAST {
  // All detected functions
  functions: {
    [ fromLine: number]: FunctionNode[]
  };
  // All comments
  comments: {
    [ toLine: number ]: CommentNode[]
  };
}

export interface FunctionNode {
  fromLine: number;
  toLine: number;
}

export interface CommentNode {
  fromLine: number;
  toLine: number;
  content: string;
}

// Language-agnostic AST slightly more specific than the `FileAST` thereby making it easier to put algorithms on top
// of it related to VD.
export interface ReducedFileAST {
  // All functions detected in file
  functions: {
    [ fromLine: number]: FunctionNode[]
  };

  // Only comments that are relevant to VD
  comments: {
    [ toLine: number ]: ReducedCommentNode
  };
}

/** A ReducedCommentNode must repreent a comment that has some VD information in it. */
export interface ReducedCommentNode {
  fromLine: number;
  toLine: number;
  data:
    { dataType: "tag-declaration", owner: string, tagType: VdTagType } |
    { dataType: "tag-end-block" }
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

export const newEmptyFileAst = (): FileAST => R.clone({ functions: {}, comments: {} })

export const newEmptyReducedFileAst = (): ReducedFileAST => R.clone({ functions: {}, comments: {} })

// Add a function to the AST
// @MODIFIES fileAst
export const addFunctionToAst = (fileAst: FileAST | ReducedFileAST, functionNode: FunctionNode): void => {
  if (fileAst.functions[functionNode.fromLine] === undefined) {
    fileAst.functions[functionNode.fromLine] = [ functionNode ]
    return
  }

  fileAst.functions[functionNode.fromLine].push(functionNode)
}

// Add a comment to the AST
// @MODIFIES fileAst
export const addCommentToAst = (fileAst: FileAST, commentNode: CommentNode): void => {
  if (fileAst.comments[commentNode.toLine] === undefined) {
    fileAst.comments[commentNode.toLine] = [ commentNode ]
    return
  }

  fileAst.comments[commentNode.toLine].push(commentNode)
}

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

// Converts ast to VD tags
const astToTags = (language: Language, fileAst: FileAST): VdTag[] => {

  const reducedAst = reduceFileAst(fileAst)

  switch (language) {

    case "CPlusPlus":
      return cpp.astToTags(reducedAst)

    case "Java":
      return java.astToTags(reducedAst)

    case "Javascript":
      return javascript.astToTags(reducedAst)

    case "Python":
      return python.astToTags(reducedAst)

    case "Typescript":
      return typescript.astToTags(reducedAst)

  } // end switch
}
