/// Module for helpers related to the different ASTs used to represent the parsed file.

import * as R from "ramda";

import * as File from "../file"
import * as Tag from "../tag"
import * as LangUtil from "./util"


/** Language-agnostic AST containing comments (including content) and function line numbers.

  NOTE: You should create this from the `RawFileAst`.

  NOTE: This AST does not contain the content of all nodes, only the line numbers. Only comments are parsed to capture
  the content for VD tag analysis, functions are lexed to ignore many characters - you must use the full files to
  retrieve the tag from the given line numbers.

  NOTE: This is used to create `ReducedFileAst`.
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


/** Language-agnostic AST containing seperate comments (single/multi) and function line numbers.

  REFER: `FileAst`. This is used to create a `FileAst`. This is a useful step because of the feature of merging
          single line comments.
 */
export interface RawFileAst {
  // All detected functions.
  functions: {
    [ startLine: number]: FunctionNode[]
  };

  singleLineComments: {
    [endLine: number]: RawCommentNode; // Can only have 1 on a single line
  };

  multiLineComments: {
    [endline: number]: CommentNode[];
  }
}


export type RawCommentNode = CommentNode & {
  indentIndex: number;
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


export const newEmptyRawFileAst = (): RawFileAst => {
  return {
    functions: { },
    singleLineComments: { },
    multiLineComments: { }
  }
}


export const newEmptyFileAst = (): FileAst => {
  return {
    functions: { },
    comments: { }
  }
}


export const newEmptyReducedFileAst = (): ReducedFileAst => {
  return {
    functions: { },
    comments: { }
  }
}


// Add a function to the RawAST
// @MODIFIES fileAst
export const addFunctionToRawAst = (fileAst: RawFileAst, functionNode: FunctionNode): void => {
  if (fileAst.functions[functionNode.startLine] === undefined) {
    fileAst.functions[functionNode.startLine] = [ functionNode ]
    return
  }

  fileAst.functions[functionNode.startLine].push(functionNode)
}


// Add a single-line comment to the RawAST
// @MODIFIES fileAst
export const addSingleLineCommentToRawAst = (rawFileAst: RawFileAst, rawCommentNode: RawCommentNode): void => {
  rawFileAst.singleLineComments[rawCommentNode.endLine] = rawCommentNode;
}


export const addMultilineCommentToRawAst = (rawFileAst: RawFileAst, commentNode: CommentNode): void => {
  if (rawFileAst.multiLineComments[commentNode.endLine] === undefined) {
    rawFileAst.multiLineComments[commentNode.endLine] = [ commentNode ];
    return;
  }

  rawFileAst.multiLineComments[commentNode.endLine].push(commentNode);
}


/** Will handle merging single line comments that are consecutive and start at the same index in the line. */
export const getFileAstFromRawFileAst = (rawFileAst: RawFileAst): FileAst => {

  const fileAst = newEmptyFileAst();

  fileAst.functions = rawFileAst.functions;

  for (let endLine in rawFileAst.multiLineComments) {
    fileAst.comments[endLine] = rawFileAst.multiLineComments[endLine];
  }

  const squishedSingleLineComments = squishSingleLineComments(rawFileAst.singleLineComments);

  for (let endLine in squishedSingleLineComments) {

    if (fileAst.comments[endLine] === undefined) {
      fileAst.comments[endLine] = [ squishedSingleLineComments[endLine] ];
      continue;
    }

    fileAst.comments[endLine].push(squishedSingleLineComments[endLine]);
  }

  return fileAst;
}


/** Reduce an AST to only contain relevant information.
 */
export const getReducedFileAstFromFileAst = (fileAst: FileAst): ReducedFileAst => {
  const reducedFileAst = newEmptyReducedFileAst()

  // Functions all deep-copied
  reducedFileAst.functions = R.clone(fileAst.functions)

  // Comments must be parsed to include only comments with data
  for (let commentLineNumber in fileAst.comments) {

    const commentNodes = fileAst.comments[commentLineNumber]

    // TODO More than one commment ending on the same line? Support use-case?
    if(commentNodes.length > 1) {
      throw Error("TODO3")
    }

    const commentNode = commentNodes[0]
    const match = LangUtil.matchSingleVdTagAnnotation(commentNode.content)
    switch (match.branchTag) {

      case "case-1":
        continue

      case "case-2":
        reducedFileAst.comments[commentNode.endLine] = {
          startLine: commentNode.startLine,
          endLine: commentNode.endLine,
          data: { dataType: "tag-end-block", seen: false }
        }
        continue

      case "case-3":
        const { owner, tagType, tagAnnotationLineOffset } = match.value
        reducedFileAst.comments[commentNode.endLine] = {
          startLine: commentNode.startLine,
          endLine: commentNode.endLine,
          data: {
            dataType: "tag-declaration",
            tagType,
            owner,
            tagAnnotationLine: commentNode.startLine + tagAnnotationLineOffset
          }
        }
        continue;
    }

  } // End loop

  return reducedFileAst
}


/** Most languages will get the tags from the AST the same way.

  Noteable exceptions are languages like python which can have comments under the function declarations instead of
  before.
 */
export const standardTagsFromReducedFileAst = (reducedFileAst: ReducedFileAst, fileContent: string): Tag.VdTag[] => {

  const vdTags: Tag.VdTag[] = []

  loopAnalyzeComments:
  for (let commentLineNumber in reducedFileAst.comments) {

    const reducedCommentNode = reducedFileAst.comments[commentLineNumber]

    switch (reducedCommentNode.data.dataType ) {

      case "tag-declaration":

        switch ( reducedCommentNode.data.tagType ) {

          case "file":
            vdTags.push({
              tagType: "file",
              owner: reducedCommentNode.data.owner,
              tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
              content: File.splitFileContentIntoLines(fileContent),
              startLine: 1,
              endLine: File.getNumberOfLinesForFile(fileContent)
            })
            continue

          case "line": {
            const startLine = reducedCommentNode.startLine
            const endLine = reducedCommentNode.endLine + 1 // + 1 because it owns a single line

            vdTags.push({
              tagType: "line",
              owner: reducedCommentNode.data.owner,
              startLine,
              endLine,
              tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
              content: LangUtil.getContentByLineNumbers(fileContent, startLine, endLine)
            })
            continue
          }

          case "function": {
            const functionNodes = reducedFileAst.functions[reducedCommentNode.endLine + 1]

            // No function
            if (functionNodes === undefined) {
              throw new Error("TODO - No function")
            }

            // More than one function on that line, how to handle?
            if (functionNodes.length > 1) {
              throw new Error("TODO - Multiple functions on one line?")
            }

            const functionNode = functionNodes[0]
            const startLine = reducedCommentNode.startLine
            const endLine = functionNode.endLine

            vdTags.push({
              tagType: "function",
              startLine,
              endLine,
              owner: reducedCommentNode.data.owner,
              tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
              content: LangUtil.getContentByLineNumbers(fileContent, startLine, endLine)
            })
            continue
          }

          case "block": {

            const commentLineNumbers = R.pipe(
              R.map(parseInt),
              R.sort((a, b) => { return a - b })
            )(Object.keys(reducedFileAst.comments))

            // Find end-block annotation
            for (let commentLineNumber of commentLineNumbers) {
              if (commentLineNumber < reducedCommentNode.endLine) {
                continue;
              }

              const currentCommentNode = reducedFileAst.comments[commentLineNumber]

              if (currentCommentNode.data.dataType === "tag-end-block" ) {

                // Can't use the same end-block twice
                if (currentCommentNode.data.seen) {
                  throw new Error("TODO - End block already used")
                }

                const startLine = reducedCommentNode.startLine
                const endLine = reducedFileAst.comments[commentLineNumber].endLine

                currentCommentNode.data.seen = true
                vdTags.push({
                  tagType: "block",
                  startLine,
                  endLine,
                  owner: reducedCommentNode.data.owner,
                  tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
                  content: LangUtil.getContentByLineNumbers(fileContent, startLine, endLine)
                })
                continue loopAnalyzeComments
              }
            }

            // Otherwise we have no ending block?
            throw new Error("TODO4")
          }

        } // end inner switch

    } // end switch

  } // end for loop

  return vdTags
}


const squishSingleLineComments =
  ( singleLineComments: { [endLine: number]: RawCommentNode }
  ) : { [endLine: number]: CommentNode } => {

  const result: { [endLine: number]: CommentNode } = { };
  const endLines: number[] = Object.keys(singleLineComments).map((endLineAsStr) => parseInt(endLineAsStr, 10));
  const ascendingEndLines = R.sort((a, b) => a - b, endLines);

  for (let endLine of ascendingEndLines) {

    const commentAbove = singleLineComments[endLine - 1];
    const currentComment = singleLineComments[endLine];

    // No mergable comment
    if ( commentAbove === undefined || commentAbove.indentIndex !== currentComment.indentIndex) {
      result[endLine] = singleLineComments[endLine];
      continue;
    }

    // Merge comment
    const finalCommentAbove = result[endLine - 1];
    delete result[endLine - 1];
    result[endLine] = {
      content: `${finalCommentAbove.content}${currentComment.content}`,
      endLine: endLine,
      startLine: finalCommentAbove.startLine
    }
  }

  return result;
}
