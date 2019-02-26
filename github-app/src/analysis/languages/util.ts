// Module for utility functions for common language-related things.

import R from "ramda"
import { DefaultErrorStrategy } from 'antlr4ts/DefaultErrorStrategy';

import * as Lang from "./index"
import * as Tag from "../tag-parser"
import * as F from "../../functional-types"


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

/** Checkes if a string contains a single VD tag annotation.

  Throws an error if the string doesn't follow VD annotation rules:
    1. Can only have 1 tag annotation prefix (` @VD`)
      - This thereby prevents multiple full tag annotations
    2. Must have a full tag/end-block if you have the @VD prefix somewhere
    3. Cannot have both a tag and an end block
*/
export const matchSingleVdTagAnnotation =
    ( str: string )
    : F.Tri<"no-match", "match-block", { owner: string, tagType: Tag.VdTagType }> => {

  const matchVdTagAnnotationPrefix = str.match(MATCH_VD_COMMENT_PREFIX_REGEX)

  if (matchVdTagAnnotationPrefix === null) {
    return F.branch1<"no-match">("no-match");
  }

  // Breaks rule 1
  if (matchVdTagAnnotationPrefix.length > 1) {
    throw new Error("TODO")
  }

  const matchTagAnnotation = str.match(MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX)
  const matchEndBlock = str.match(MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX)
  const hasMatchedTag = matchTagAnnotation !== null
  const hasMatchedEndBlock =  matchEndBlock !== null

  // Breaks rule 2
  if(!hasMatchedEndBlock && !hasMatchedTag) {
    throw new Error("TODO")
  }

  // Breaks rule 3
  if(hasMatchedEndBlock && hasMatchedTag) {
    throw new Error("TODO")
  }

  // Matched a single tag
  if (hasMatchedTag) {
    const [ , , owner, tagType ] = matchTagAnnotation as [ null, null, string, Tag.VdTagType ]

    return F.branch3({ owner, tagType  })
  }

  // Matched end block
  return F.branch2<"match-block">("match-block");
}

/** Reduce an AST to only contain relevant information.
 */
export const reduceFileAst = (fileAst: Lang.FileAst): Lang.ReducedFileAst => {
  const reducedFileAst = Lang.newEmptyReducedFileAst()

  // Functions all deep-copied
  reducedFileAst.functions = R.clone(fileAst.functions)

  // Comments must be parsed to include only comments with data
  for (let commentLineNumber in fileAst.comments) {

    const commentNodes = fileAst.comments[commentLineNumber]

    // TODO More than one commment ending on the same line? Support use-case?
    if(commentNodes.length > 1) {
      throw Error("TODO")
    }

    const commentNode = commentNodes[0]
    const match = matchSingleVdTagAnnotation(commentNode.content)
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
        const { owner, tagType } = match.value
        reducedFileAst.comments[commentNode.endLine] = {
          startLine: commentNode.startLine,
          endLine: commentNode.endLine,
          data: {
            dataType: "tag-declaration",
            tagType,
            owner
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
export const standardTagsFromReducedFileAst = (reducedFileAst: Lang.ReducedFileAst): Tag.VdTag[] => {

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
              owner: reducedCommentNode.data.owner
            })
            continue

          case "line":
            vdTags.push({
              tagType: "line",
              owner: reducedCommentNode.data.owner,
              startLine: reducedCommentNode.startLine,
              endLine: reducedCommentNode.endLine + 1
            })
            continue

          case "function":
            const functionNodes = reducedFileAst.functions[reducedCommentNode.endLine + 1]

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
              startLine: reducedCommentNode.startLine,
              endLine: functionNode.endLine,
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
              if (commentLineNumber < reducedCommentNode.endLine) {
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
                  startLine: reducedCommentNode.startLine,
                  endLine: reducedFileAst.comments[commentLineNumber].endLine,
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
