import R from "ramda"

import { FileAST, ReducedFileAST, newEmptyReducedFileAst } from "./index"
import { VdTag, VdTagType } from "../tag-parser"

import { DefaultErrorStrategy } from 'antlr4ts/DefaultErrorStrategy';


// All VD information must have this prefix
const MATCH_VD_COMMENT_PREFIX_REGEX = /\s(@VD)\b/g
// Matching a new tag
const MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX = /\s(@VD @([a-zA-Z0-9-]*) (function|block|file|line))\b/
// The end of a block tag
const MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX = /\s(@VD end-block)\b/g

/** To keep track of the existance of some error during parsing. */
export class ErrorHappenedStrategy extends DefaultErrorStrategy {

  public hasError: boolean;

  constructor() {
    super();
    this.hasError = false;
  }

  // Called during parsing error
  reportError() {
    this.hasError = true;
  }
}

/** Reduce an AST to only contain relevant information.
 */
export const reduceFileAst = (fileAst: FileAST): ReducedFileAST => {
  const reducedFileAst = newEmptyReducedFileAst()

  // Functions all deep-copied
  reducedFileAst.functions = R.clone(fileAst.functions)

  // Comments must be parsed to include only comments with data
  for (let commentLineNumber in fileAst.comments) {

    const commentNodes = fileAst.comments[commentLineNumber]

    // TODO More than one commment ending on the same line? Support use-case?
    if(commentNodes.length > 1) {
      throw Error("TODO")
    }

    // Check against VD prefix
    const commentNode = commentNodes[0]
    let matches = commentNode.content.match(MATCH_VD_COMMENT_PREFIX_REGEX)
    if (matches === null) {
      // No VD tag
      continue;
    }
    // More than one VD prefix
    if (matches.length > 1) {
      throw new Error("TODO")
    }

    const matchTagAnnotation = commentNode.content.match(MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX)
    const matchEndBlock = commentNode.content.match(MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX)
    const hasMatchedTag = matchTagAnnotation !== null
    const hasMatchedEndBlock =  matchEndBlock !== null

    // New annotation and ending block supported?
    if(hasMatchedEndBlock && hasMatchedTag) {
      throw new Error("TODO")
    }

    // Tag prefix but no proper information of any kind
    if(!hasMatchedEndBlock && !hasMatchedTag) {
      throw new Error("TODO")
    }

    //  Tag Annotation
    if (matchTagAnnotation) {
      const [ , , owner, tagType ] = matchTagAnnotation as RegExpMatchArray

      reducedFileAst.comments[commentNode.toLine] = {
        fromLine: commentNode.fromLine,
        toLine: commentNode.toLine,
        data: {
          dataType: "tag-declaration",
          tagType: tagType as VdTagType, // regex only matches valid tag types
          owner
        }
      }
      continue;
    }

    // End of a block
    if (matchEndBlock) {
      reducedFileAst.comments[commentNode.toLine] = {
        fromLine: commentNode.fromLine,
        toLine: commentNode.toLine,
        data: { dataType: "tag-end-block", seen: false }
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
export const standardTagsFromReducedFileAst = (reducedFileAst: ReducedFileAST): VdTag[] => {

  const vdTags: VdTag[] = []

  loopAnalyzeComments:
  for (let commentLineNumber in reducedFileAst.comments) {

    const reducedCommentNode = reducedFileAst.comments[commentLineNumber]

    switch (reducedCommentNode.data.dataType ) {

      case "tag-declaration":

        switch ( reducedCommentNode.data.tagType ) {

          case "file":
            vdTags.push({
              tagType: "file",
              owner: reducedCommentNode.data.owner
            })
            continue

          case "line":
            vdTags.push({
              tagType: "line",
              owner: reducedCommentNode.data.owner,
              startLineNumber: reducedCommentNode.fromLine,
              endLineNumber: reducedCommentNode.toLine + 1
            })
            continue

          case "function":
            const functionNodes = reducedFileAst.functions[reducedCommentNode.toLine + 1]

            // No function
            if (functionNodes === undefined) {
              throw new Error("TODO")
            }

            // More than one function on that line, how to handle?
            if (functionNodes.length > 1) {
              throw new Error("TODO")
            }

            const functionNode = functionNodes[0]

            vdTags.push({
              tagType: "function",
              startLineNumber: reducedCommentNode.fromLine,
              endLineNumber: functionNode.toLine,
              owner: reducedCommentNode.data.owner
            })
            continue

          case "block":

            const commentLineNumbers = R.pipe(
              R.map(parseInt),
              R.sort((a, b) => { return a - b })
            )(Object.keys(reducedFileAst.comments))

            // Find end-block annotation
            for (let commentLineNumber of commentLineNumbers) {
              if (commentLineNumber < reducedCommentNode.toLine) {
                continue;
              }

              const currentCommentNode = reducedFileAst.comments[commentLineNumber]

              if (currentCommentNode.data.dataType === "tag-end-block" ) {

                // Can't use the same end-block twice
                if (currentCommentNode.data.seen) {
                  throw new Error("TODO")
                }

                currentCommentNode.data.seen = true
                vdTags.push({
                  tagType: "block",
                  startLineNumber: reducedCommentNode.fromLine,
                  endLineNumber: reducedFileAst.comments[commentLineNumber].toLine,
                  owner: reducedCommentNode.data.owner
                })
                continue loopAnalyzeComments
              }
            }

            // Otherwise we have no ending block?
            throw new Error("TODO")
        } // end inner switch

    } // end switch

  } // end for loop

  return vdTags
}
