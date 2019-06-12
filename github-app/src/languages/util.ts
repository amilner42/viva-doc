// Module for utility functions for common language-related things.

import { DefaultErrorStrategy } from 'antlr4ts/DefaultErrorStrategy';

import * as File from "../file"
import * as SH from "../string-helpers"
import * as Tag from "../tag"
import * as F from "../functional"


/** All VD information must have this prefix

  Regex uses look-before/look-ahead to prevent consuming spaces to get 2 matches on the following: " @VD @VD"

  Does a global purposefully search to see if comment [illegaly] contains more than a single "@VD"
*/
const MATCH_VD_COMMENT_PREFIX_REGEX = /(?<=^|\s)@VD(?=\s|$)/g

/** Matching a new tag annotation

  Captures 4 groups:
    - All optional characters before the annotation, allowing to figure out the annotation offset
    - One forced: start of string or newline or space before the tag annotation
    - The username
    - The type of tag annotation

  NOTE: You can pass the full comment to detect matches or even a single line (possibly an AlteredLine) to see if there
        is an annotation on that specific line of the comment.
*/
const MATCH_VD_COMMENT_TAG_ANNOTATION_REGEX = /((?:\s|.)*?)(^|\r\n|\r|\n|\s)@VD ([a-zA-Z0-9-]*) (block|file|line)(?=\s|$)/

/** The end of a block tag.

  NOTE: You can pass the full comment to detect matches or even a single line (possibly an AlteredLine) to see if there
        is an annotation on that specific line of the comment.
*/
const MATCH_VD_COMMENT_END_BLOCK_ANNOTATION_REGEX = /(^|\s)@VD end-block(?=\s|$)/

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
    const [ , optionalCharsBeforeAnnotation, newLineOrSpaceBeforeTag, owner, tagType ] =
      matchTagAnnotation as [ string, string, string, string, Tag.VdTagType ]
    const tagAnnotationLineOffset =
      SH.getNumberOfNewLineTerminators(optionalCharsBeforeAnnotation) +
      SH.getNumberOfNewLineTerminators(newLineOrSpaceBeforeTag);

    return F.branch3({ owner, tagType, tagAnnotationLineOffset })
  }

  // Matched end block
  return F.branch2<"match-block">("match-block");
}


/** Retrieve the content of a tag from a file given the start line and end line.

@THROWS a TODO error if the `startLine` is < 1 OR `endLine` > number of lines in the file
*/
export const getContentByLineNumbers = (fileContent: string, startLine: number, endLine: number): string[] => {

  const fileSplitByLines = File.splitFileContentIntoLines(fileContent)
  const tagContent = []

  // Attempting to get content outside the file...
  if (startLine < 1 || endLine > fileSplitByLines.length) {
    throw new Error("TODO5")
  }

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
    tagContent.push(fileSplitByLines[lineIndex - 1])
  }

  return tagContent;
}
