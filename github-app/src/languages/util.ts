// Module for utility functions for common language-related things.

import R from "ramda"
import { DefaultErrorStrategy } from 'antlr4ts/DefaultErrorStrategy';

import * as File from "../file"
import * as SH from "../string-helpers"
import * as Lang from "./index"
import * as Tag from "../tag"
import * as F from "../functional"


/** All VD information must have this prefix

  Regex uses look-before/look-ahead to prevent consuming spaces to get 2 matches on the following: " @VD @VD"

  Does a global purposefully search to see if comment [illegaly] contains more than a single "@VD"
*/
const MATCH_VD_COMMENT_PREFIX_REGEX = /(?<=^|\s)@VD(?=\s|$)/g

/** Matching a new tag annotation

  Captures 3 groups:
    - All space characters (\s) before the annotation, allowing to figure out the annotation offset
    - The username
    - The type of tag annotation
*/
const MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX = /(^|\s+)@VD ([a-zA-Z0-9-]*) (function|block|file|line)(?=\s|$)/
/** The end of a block tag */
const MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX = /\s@VD end-block(?=\s|$)/

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

/** Checkes if a string contains a single VD tag annotation and returns relevant information.

  Throws an error if the string doesn't follow VD annotation rules:
    1. Can only have 1 tag annotation prefix (` @VD`)
      - This thereby prevents multiple full tag annotations
    2. Must have a full tag/end-block if you have the @VD prefix somewhere
    3. Cannot have both a tag and an end block
*/
export const matchSingleVdTagAnnotation =
    ( str: string )
    : F.Tri<"no-match", "match-block", { owner: string, tagType: Tag.VdTagType, tagAnnotationLineOffset: number }> => {

  const matchVdTagAnnotationPrefix = str.match(MATCH_VD_COMMENT_PREFIX_REGEX)

  if (matchVdTagAnnotationPrefix === null) {
    return F.branch1<"no-match">("no-match");
  }

  // Breaks rule 1
  if (matchVdTagAnnotationPrefix.length > 1) {
    throw new Error("TODO - Breaks rule 1")
  }

  const matchTagAnnotation = str.match(MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX)
  const matchEndBlock = str.match(MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX)
  const hasMatchedTag = matchTagAnnotation !== null
  const hasMatchedEndBlock =  matchEndBlock !== null

  // Breaks rule 2
  if(!hasMatchedEndBlock && !hasMatchedTag) {
    throw new Error("TODO - Breaks rule 2")
  }

  // Breaks rule 3
  if(hasMatchedEndBlock && hasMatchedTag) {
    throw new Error("TODO - Breaks rule 3")
  }

  // Matched a single tag
  if (hasMatchedTag) {
    const [ , whiteSpaceBeforeAnnotation, owner, tagType ] = matchTagAnnotation as [ string, string, string, Tag.VdTagType ]
    const tagAnnotationLineOffset = SH.getNumberOfNewLineTerminators(whiteSpaceBeforeAnnotation)

    return F.branch3({ owner, tagType, tagAnnotationLineOffset })
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
export const standardTagsFromReducedFileAst = (reducedFileAst: Lang.ReducedFileAst, fileContent: string): Tag.VdTag[] => {

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
              content: getContentByLineNumbers(fileContent, startLine, endLine)
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
              content: getContentByLineNumbers(fileContent, startLine, endLine)
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
                  content: getContentByLineNumbers(fileContent, startLine, endLine)
                })
                continue loopAnalyzeComments
              }
            }

            // Otherwise we have no ending block?
            throw new Error("TODO")
          }

        } // end inner switch

    } // end switch

  } // end for loop

  return vdTags
}

/** Retrieve the content of a tag from a file given the start line and end line.

@THROWS a TODO error if the `startLine` is < 1 OR `endLine` > number of lines in the file
*/
const getContentByLineNumbers = (fileContent: string, startLine: number, endLine: number): string[] => {

  const fileSplitByLines = File.splitFileContentIntoLines(fileContent)
  const tagContent = []

  // Attempting to get content outside the file...
  if (startLine < 1 || endLine > fileSplitByLines.length) {
    throw new Error("TODO")
  }

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
    tagContent.push(fileSplitByLines[lineIndex - 1])
  }

  return tagContent;
}
