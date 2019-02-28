// Module for handling parsing git diffs.

import R from "ramda"

import * as AnalysisUtil from "./util"
import * as F from "../functional-types"
import * as AppError from "../error"

/** EXTERNAL TYPES */

/** COMPOSITION */

export interface HasCurrentFilePath {
  currentFilePath: string;
}

export interface HasPreviousFilePath {
  previousFilePath: string;
}

export interface HasAlteredLines {
  alteredLines: LineDiff[];
}

/** A single line of a git diff.

  Includes both the line number in the current version of the file and the line number from the previous version
  of the file.
 */
export interface LineDiff {
  type: "added" | "deleted";
  currentLineNumber: number;
  previousLineNumber: number;
  content: string;
}

export type DiffType = "new" | "modified" | "renamed" | "deleted"

export type FileDiff = NewFileDiff | ModifiedFileDiff | RenamedFileDiff | DeletedFileDiff

export type NewFileDiff = HasCurrentFilePath & HasAlteredLines & {
  diffType: "new";
}

export type ModifiedFileDiff = HasCurrentFilePath & HasAlteredLines & {
  diffType: "modified";
}

export type RenamedFileDiff = HasCurrentFilePath & HasPreviousFilePath & HasAlteredLines & {
  diffType: "renamed";
}

export type DeletedFileDiff = HasCurrentFilePath & HasAlteredLines & {
  diffType: "deleted",
}

// All errors from this module
export class DiffParserError extends AppError.ProbotAppError {
  constructor(msg: string) {
    super(msg);
  }
}

/** CONSTANTS */

const FILE_DIFF_FIRST_LINE = "diff --git"
const DELETED_FILE_PREFIX = "deleted file"
const NEW_FILE_PREFIX = "new file"
const MODIFIED_NO_CHANGE_LINE_PREFIX = " "
const MODIFIED_ADDED_LINE_PREFIX = "+"
const MODIFIED_DELETED_LINE_PREFIX = "-"
const HUNK_PREFIX = "@@ "
const HUNK_SUFFIX = " @@" // there can be an optional header after this
const HUNK_CURRENT_RANGE_PREFIX = "+"
const HUNK_PREVIOUS_RANGE_PREFIX = "-"

/** External Functions */

// Main function of the module, will parse the git diff into a series of file diffs.
export const parseDiff = (diffAsStr: string): FileDiff[] => {
  // We dropLast here to get rid of the trailing "\n" causing our remainingLines to end in a [ ..., "" ]
  let remainingLines = R.dropLast(1, AnalysisUtil.splitIntoLines(diffAsStr));
  const fileDiffs: FileDiff[] = [];

  while(remainingLines.length !== 0) {
    let [ postDiffRemainingLines, fileDiff ] = getSingleFileDiff(remainingLines)
    fileDiffs.push(fileDiff)
    remainingLines = postDiffRemainingLines
  }

  return fileDiffs;
}

/** INTERNAL */

type ParseStage = "line-1" | "line-2" | "diff"

const getSingleFileDiff = (diffByLines: string[]): [string[], FileDiff] => {

  // The index into the string[], this is useful for knowing how far into the string[] we've parsed so when we
  // hit the next git diff we know how many lines we've consumed.
  let lineIndex = 0;
  let parseStage: ParseStage = "line-1"
  let previousFilePath: F.Maybe<string> = null;
  let currentFilePath: F.Maybe<string> = null;
  let diffType: F.Maybe<DiffType> = null;
  let skip = 0;
  let deletedFile: F.Maybe<DeletedFileDiff> = null;
  let newFile: F.Maybe<NewFileDiff> = null;
  let modifiedFile: F.Maybe<ModifiedFileDiff | RenamedFileDiff> = null;
   // Keeps track of the diff line number for added/removed lines, will start at 1 on deleted/added files,
   // otherwise reads where in the file we are from the hunk.
  let lineNumbers: F.Maybe<{ currentLineNumber: number, previousLineNumber: number }> = null;

  for (let line of diffByLines) {
    lineIndex++;

    if (skip > 0) {
      skip--;
      continue;
    }

    // We've got a deleted file and are simply adding all the deletions and then returning the next git diff
    if (deletedFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        // Once we pass the hunk we set lineNumbers to 1 to track remaining deleted lines
        if (line.startsWith(HUNK_PREFIX)) {
          lineNumbers = { currentLineNumber: 1, previousLineNumber: 1 }
          continue;
        }

        // If we've passed the hunk then we record lines as deleted
        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX) && lineNumbers !== null) {
          deletedFile.alteredLines.push({
            type: "deleted",
            content: line.substr(MODIFIED_DELETED_LINE_PREFIX.length),
            currentLineNumber: 1,
            previousLineNumber: lineNumbers.previousLineNumber
          })
          lineNumbers.previousLineNumber++
        }
        continue;
      }

      return [ R.drop(lineIndex - 1, diffByLines), deletedFile ];
    }

    // We've got a new file and are simply adding all the insertions and then returning the next git diff
    if (newFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        // Once we pass the hunk we set lineNumbers to 1 to track remaining added lines
        if (line.startsWith(HUNK_PREFIX)) {
          lineNumbers = { previousLineNumber: 1, currentLineNumber: 1 }
          continue;
        }

        // If we've passed the hunk then we record lines as added
        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX) && lineNumbers !== null) {
          newFile.alteredLines.push({
            type: "added",
            content: line.substr(MODIFIED_ADDED_LINE_PREFIX.length),
            previousLineNumber: 1,
            currentLineNumber: lineNumbers.currentLineNumber
          })
          lineNumbers.currentLineNumber++
        }
        continue;
      }

      return [ R.drop(lineIndex - 1, diffByLines), newFile ]
    }

    switch(parseStage) {

      // The very start of the git diff
      case "line-1":
        // TODO bug fix: this parse system could produce error if the 2nd file that contains  " b/"
        const fileAPrefix = " a/"
        const fileBPrefix = " b/"
        let remainingLine = line

        if(!remainingLine.startsWith(FILE_DIFF_FIRST_LINE)) {
          throw new DiffParserError(`Expected diff to start with "${FILE_DIFF_FIRST_LINE}": ${line}`)
        }

        remainingLine = line.substr(FILE_DIFF_FIRST_LINE.length)

        if(!remainingLine.startsWith(fileAPrefix)) {
          throw new DiffParserError(
            `Malformed first line of git diff, must have "${fileAPrefix}" after "${FILE_DIFF_FIRST_LINE}": ${line}`
          )
        }

        remainingLine = remainingLine.substr(fileAPrefix.length)

        const bothFiles = remainingLine.split(fileBPrefix)

        if(bothFiles.length !== 2) {
          throw new DiffParserError(`Expected exactly 2 files on the first line: ${line}`)
        }

        const filePathA = bothFiles[0]
        const filePathB = bothFiles[1]

        if(filePathA === "" || filePathB === "") {
          throw new DiffParserError(`You can't have empty file names: ${line}`)
        }

        // We have a rename situation
        if(filePathA !== filePathB) {
          diffType = "renamed"
        }

        // For renamed files we need both
        previousFilePath = filePathA;
        currentFilePath = filePathB;

        parseStage = "line-2"
        break;

      // The second line of a renamed file has a specific format
      case "line-2":

        // Should always be set on the first line
        if(previousFilePath === null || currentFilePath === null) {
          throw new DiffParserError("Internal Error: 1");
        }

        if (diffType === "renamed") {
          if (line === "similarity index 100%") {
            // Identical files means it's just a rename
            // We can proceed to the next git diff
            return [
              R.drop(4, diffByLines),
              { diffType, currentFilePath, previousFilePath, alteredLines: [] }
            ]
          } else {
            // It's a rename and a modifcation, we still have to parse modifications
            skip = 5;
            parseStage = "diff"
            break;
          }
        }

        // Otherwise we don't know if it's: deleted file / new file / modification

        // Deleted file
        if (line.startsWith(DELETED_FILE_PREFIX)) {
          deletedFile = { diffType: "deleted", currentFilePath, alteredLines: [] }
          break;
        }

        // New file
        if (line.startsWith(NEW_FILE_PREFIX)) {
          newFile = { diffType: "new", currentFilePath, alteredLines: [] }
          break;
        }

        // Modification
        diffType = "modified"
        skip = 2
        parseStage = "diff"
        break;


      case "diff":

        // At this stage we should have the file name and the diff type
        if (  diffType === null
           || !(diffType === "modified" || diffType === "renamed")
           || currentFilePath === null
           || previousFilePath === null
           ) {
          throw new DiffParserError("Internal Error: 3")
        }

        // We should be on a diff hunk if we have no saved start line
        if (lineNumbers === null) {
          lineNumbers = extractStartLineNumbersFromHunk(line)

          // Meaningless if/else to make ts happy.
          if(diffType === "modified") {
            modifiedFile = {
              currentFilePath,
              diffType,
              alteredLines: []
            }
          } else {
            modifiedFile = {
              currentFilePath,
              previousFilePath,
              diffType,
              alteredLines: []
            }
          }

          break
        }

        // Otherwise we could be in the last diff or hit a new diff hunk

        if (modifiedFile === null) {
          throw new DiffParserError("Internal Error: 5")
        }

        // An unaltered line
        if (line.startsWith(MODIFIED_NO_CHANGE_LINE_PREFIX)) {
          lineNumbers.currentLineNumber++
          lineNumbers.previousLineNumber++
          break
        }

        // A deleted line
        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX)) {

          modifiedFile.alteredLines.push({
            type: "deleted",
            previousLineNumber: lineNumbers.previousLineNumber,
            currentLineNumber: lineNumbers.currentLineNumber,
            content: line.substr(MODIFIED_DELETED_LINE_PREFIX.length)
          })

          lineNumbers.previousLineNumber++
          break
        }

        // An added line
        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX)) {
          modifiedFile.alteredLines.push({
            type: "added",
            previousLineNumber: lineNumbers.previousLineNumber,
            currentLineNumber: lineNumbers.currentLineNumber,
            content: line.substr(MODIFIED_ADDED_LINE_PREFIX.length)
          })
          lineNumbers.currentLineNumber++
          break
        }

        // Check if we've hit another diff hunk
        if (line.startsWith(HUNK_PREFIX)) {
          lineNumbers = extractStartLineNumbersFromHunk(line)
          break
        }

        // Otherwise we're on to another git diff
        if (modifiedFile === null) {
          throw new DiffParserError("Internal Error: 4")
        }
        return [ R.drop(lineIndex - 1, diffByLines), modifiedFile ]

    } // end of switch
  } // end of for loop

  // If we've ran out of lines in our git diff, either we have something ready and it was the last git diff in the
  // file and we can submit it or there was some kind of internal error.

  if (deletedFile !== null) {
    return [ [], deletedFile ]
  }

  if (newFile !== null) {
    return [ [], newFile ]
  }

  if (modifiedFile !== null) {
    return [ [], modifiedFile ]
  }

  throw new DiffParserError("Internal Error: 2")
}

// Extracts the start line on the from range of a git diff hunk:
// Eg.
//  `@@ -1,4 +1,4 @@` should return "1" because of the "+1"
const extractStartLineNumbersFromHunk = (line: string): { previousLineNumber: number, currentLineNumber: number } => {

  // For extracting 11 from text formatted like: `-11,4`
  const getNumberFromText = (textWithPrefix: string, prefix: string): number => {
    const textAfterPrefixAsArray: string[] = textWithPrefix.substr(prefix.length).split("")
    const numericalChars: string[] = R.takeWhile(R.pipe(R.equals(","), R.not), textAfterPrefixAsArray) // parse until ","
    return parseInt(numericalChars.join(""))
  }

  if(!line.startsWith(HUNK_PREFIX)) {
    throw new DiffParserError(`Malformed git hunk, supposed to start with "${HUNK_PREFIX}": ${line}`)
  }

  if(!line.includes(HUNK_SUFFIX)) {
    throw new DiffParserError(`Malformed diff hunk, supposed to include "${HUNK_SUFFIX}": ${line}`)
  }

  const indexOfSuffix = line.indexOf(HUNK_SUFFIX);
  const hunkValue = line.substr(3, indexOfSuffix - 3)
  const previousAndCurrentLineNumberText = hunkValue.split(" ")

  if (previousAndCurrentLineNumberText.length !== 2) {
    throw new DiffParserError(`Malformed diff hunk, supposed to have to and from range sep by a space: ${line}`)
  }

  const previousLineNumberText = previousAndCurrentLineNumberText[0];
  const currentLineNumberText = previousAndCurrentLineNumberText[1];

  if(!previousLineNumberText.startsWith(HUNK_PREVIOUS_RANGE_PREFIX)) {
    throw new DiffParserError(`Malformed diff hunk, previousLineNumberText doesn't start with a "${HUNK_PREVIOUS_RANGE_PREFIX}": ${line}`)
  }
  if (!currentLineNumberText.startsWith(HUNK_CURRENT_RANGE_PREFIX)) {
    throw new DiffParserError(`Malformed diff hunk, currentLineNumberText doesn't start with a "${HUNK_CURRENT_RANGE_PREFIX}": ${line}`)
  }

  const previousLineNumber = getNumberFromText(previousLineNumberText, HUNK_PREVIOUS_RANGE_PREFIX)
  const currentLineNumber = getNumberFromText(currentLineNumberText, HUNK_CURRENT_RANGE_PREFIX)

  if (isNaN(previousLineNumber) || isNaN(currentLineNumber)) {
    throw new DiffParserError(`Malformed diff hunk, expecting numbers for previousLineNumber and currentLineNumber: ${previousAndCurrentLineNumberText}`)
  }

  return { previousLineNumber, currentLineNumber }
}
