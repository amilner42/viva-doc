// Module for utility-functions for general analysis tasks.

/** Split the content of a file by line seperators.

  TODO BUG: Is this something that is language-specific?
    - It seems it might not be: https://stackoverflow.com/questions/7833689/java-string-new-line

  NOTE: Using the albeit simple regex from this SO post:
    - https://stackoverflow.com/questions/1155678/javascript-string-newline-character

  For the reverse function, check out `mergeFromLines`.
*/
export const splitIntoLines = (fileContent: string): string[] => {
  return fileContent.split(/\r\n|\r|\n/g)
}

/** Merge lines into a single string using the standard `\n` seperator.

  For the reverse function, check out `splitIntoLines`.
*/
export const mergeFromLines = (fileContentLines: string[]): string => {
  return fileContentLines.join("\n")
}
