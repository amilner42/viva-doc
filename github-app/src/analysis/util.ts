// Module for utility-functions for general analysis tasks.

import * as R from "ramda"

const REGEX_MATCH_NEWLINE = /\r\n|\r|\n/g

/** Split the content of a file by line seperators.

  TODO BUG: Is this something that is language-specific?
    - It seems it might not be: https://stackoverflow.com/questions/7833689/java-string-new-line

  NOTE: Using the albeit simple regex from this SO post:
    - https://stackoverflow.com/questions/1155678/javascript-string-newline-character

  For the reverse function, check out `mergeLinesIntoFileContent`.
*/
export const splitFileContentIntoLines = (fileContent: string): string[] => {
  const fileContentLines = fileContent.split(REGEX_MATCH_NEWLINE)

  // TODO CHECK
  // Files usually end with an EOF which is the "newline" character which is really a line terminator and not a
  // new line character which is the way it is sometimes mis-interpreted.
  if (fileContent.endsWith("\n") || fileContent.endsWith("\r")) {
    return R.dropLast(1, fileContentLines)
  }

  return fileContentLines
}

/** Merge lines into a single string using the standard `\n` seperator.

  This will add a `\n` line terminator to the end.

  For the reverse function, check out `splitFileContentIntoLines`.
*/
export const mergeLinesIntoFileContent = (fileContentLines: string[]): string => {
  return fileContentLines.join("\n").concat("\n")
}

/** Get the number of lines of a file represented as a `string` or `string[]`.

  This should only be used on files because it assumes there is a final EOF token.
*/
export const getNumberOfLinesForFile = (fileContent: string | string[]) => {
  if (Array.isArray(fileContent)) {
    return fileContent.length
  }

  return splitFileContentIntoLines(fileContent).length
}

/** Gets the number of lines for some content that is not a file.

  This assumes that the content does not end by defualt in an EOF token.
*/
export const getNumberOfLinesForContent = (content: string): number => {
  return content.split(REGEX_MATCH_NEWLINE).length
}
