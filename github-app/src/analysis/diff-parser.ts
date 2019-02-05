// Module for handling parsing git diffs
import R from "ramda"

import { AnalysisError } from "./error"
import { Maybe } from "../functional-types"

/** EXTERNAL TYPES */

export type Diff = FileDiff[]

export type AlteredLines = LineDiff[];

export interface LineDiff {
  type: "added" | "deleted"
  lineNumber: number;
  content: string;
}

export type DiffType = "new" | "modified" | "renamed" | "deleted"

export type FileDiff = NewFileDiff | ModifiedFileDiff | RenamedFileDiff | DeletedFileDiff

export interface NewFileDiff {
  diffType: "new",
  filePath: string,
  alteredLines: AlteredLines
}

export interface ModifiedFileDiff {
  diffType: "modified",
  filePath: string,
  alteredLines: AlteredLines
}

export interface RenamedFileDiff {
  diffType: "renamed",
  filePath: string, // TODO change name and handle cases
  newFilePath: string,
  alteredLines: AlteredLines
}

export interface DeletedFileDiff {
  diffType: "deleted",
  filePath: string,
  alteredLines: AlteredLines
}

// All errors from this module
export class DiffParserError extends AnalysisError {
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
const HUNK_TO_RANGE_PREFIX = "+"

/** External Functions */

// Main function of the module, will parse the git diff string into a `Diff`
export const parseDiff = (diffAsStr: string): Diff => {
  // We dropLast here to get rid of the trailing "\n" causing our remainingLines to end in a [ ..., "" ]
  let remainingLines = R.dropLast(1, diffAsStr.split("\n"));
  const diff: Diff = [];

  while(remainingLines.length !== 0) {
    let [ postDiffRemainingLines, fileDiff ] = getSingleFileDiff(remainingLines)
    diff.push(fileDiff)
    remainingLines = postDiffRemainingLines
  }

  return diff;
}

/** INTERNAL */

type ParseStage = "line-1" | "line-2" | "diff"

const getSingleFileDiff = (diffByLines: string[]): [string[], FileDiff] => {

  let lineIndex = 0;
  let parseStage: ParseStage = "line-1"
  let filePath: Maybe<string> = null;
  let newFilePath: Maybe<string> = null;
  let diffType: Maybe<DiffType> = null;
  let skip = 0;
  let deletedFile: Maybe<DeletedFileDiff> = null;
  let passedDeletedFileHunk: boolean = false;
  let newFile: Maybe<NewFileDiff> = null;
  let passedNewFileHunk: boolean = false;
  let modifiedFile: Maybe<ModifiedFileDiff | RenamedFileDiff> = null;
  let diffLineNumber: Maybe<number> = null;

  for (let line of diffByLines) {
    lineIndex++;

    if (skip > 0) {
      skip--;
      continue;
    }

    // We've got a deleted file and are simply adding all the deletions and then returning the next git diff
    if (deletedFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        // We mark we are passed the hunk so remaining lines starting with "-" are deleted.
        if (line.startsWith(HUNK_PREFIX)) {
          passedDeletedFileHunk = true;
          lineIndex = 0;
          continue;
        }

        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX) && passedDeletedFileHunk) {
          deletedFile.alteredLines.push({
            type: "deleted",
            content: line.substr(MODIFIED_DELETED_LINE_PREFIX.length),
            lineNumber: lineIndex
          })
        }
        continue;
      }

      return [ R.drop(lineIndex - 1, diffByLines), deletedFile ];
    }

    // We've got a new file and are simply adding all the insertions and then returning the next git diff
    if (newFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        // We mark we are passed the hunk so remaining lines starting with "+" are added.
        if (line.startsWith(HUNK_PREFIX)) {
          passedNewFileHunk = true;
          lineIndex = 0;
          continue;
        }

        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX) && passedNewFileHunk) {
          newFile.alteredLines.push({
            type: "added",
            content: line.substr(MODIFIED_ADDED_LINE_PREFIX.length),
            lineNumber: lineIndex
          })
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

        filePath = filePathA;
        newFilePath = filePathB; // For renamed files

        parseStage = "line-2"
        break;

      // The second line of a renamed file has a specific format
      case "line-2":

        // Should always be set on the first line
        if(filePath === null || newFilePath === null) {
          throw new DiffParserError("Internal Error: 1");
        }

        if (diffType === "renamed") {
          if (line === "similarity index 100%") {
            // Identical files means it's just a rename
            // We can proceed to the next git diff
            return [
              R.drop(4, diffByLines),
              { diffType, filePath, newFilePath, alteredLines: [] }
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
          deletedFile = { diffType: "deleted", filePath, alteredLines: [] }
          break;
        }

        // New file
        if (line.startsWith(NEW_FILE_PREFIX)) {
          newFile = { diffType: "new", filePath, alteredLines: [] }
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
           || filePath === null
           || newFilePath === null
           ) {
          throw new DiffParserError("Internal Error: 3")
        }

        // We should be on a diff hunk if we have no saved start line
        if (diffLineNumber === null) {
          diffLineNumber = extractStartLineFromHunk(line)

          // Meaningless if/else to make ts happy.
          if(diffType === "modified") {
            modifiedFile = {
              filePath,
              diffType,
              alteredLines: []
            }
          } else {
            modifiedFile = {
              filePath,
              newFilePath,
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
          diffLineNumber++
          break
        }

        // A deleted line
        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX)) {

          modifiedFile.alteredLines.push({
            type: "deleted",
            lineNumber: diffLineNumber,
            content: line.substr(MODIFIED_DELETED_LINE_PREFIX.length)
          })

          break
        }

        // An added line
        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX)) {
          modifiedFile.alteredLines.push({
            type: "added",
            lineNumber: diffLineNumber,
            content: line.substr(MODIFIED_ADDED_LINE_PREFIX.length)
          })
          diffLineNumber++
          break
        }

        // Check if we've hit another diff hunk
        if (line.startsWith(HUNK_PREFIX)) {
          diffLineNumber = extractStartLineFromHunk(line)
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
const extractStartLineFromHunk = (line: string): number => {

  if(!line.startsWith(HUNK_PREFIX)) {
    throw new DiffParserError(`Malformed git hunk, supposed to start with "${HUNK_PREFIX}": ${line}`)
  }

  if(!line.includes(HUNK_SUFFIX)) {
    throw new DiffParserError(`Malformed diff hunk, supposed to include "${HUNK_SUFFIX}": ${line}`)
  }

  const indexOfSuffix = line.indexOf(HUNK_SUFFIX);
  const hunkValue = line.substr(3, indexOfSuffix - 3)
  const fromAndToRange = hunkValue.split(" ")

  if (fromAndToRange.length !== 2) {
    throw new DiffParserError(`Malformed diff hunk, supposed to have to and from range sep by a space: ${line}`)
  }

  const toRange = fromAndToRange[1];

  if (!toRange.startsWith(HUNK_TO_RANGE_PREFIX)) {
    throw new DiffParserError(`Malformed diff hunk, toRange doesn't start with a "${HUNK_TO_RANGE_PREFIX}": ${line}`)
  }

  const rangeAfterPrefixAsArray: string[] = toRange.substr(1).split("")
  const numericalChars: string[] = R.takeWhile(R.pipe(R.equals(","), R.not), rangeAfterPrefixAsArray) // parse until ","
  const toRangeStartLineNumber = parseInt(numericalChars.join(""))

  if (isNaN(toRangeStartLineNumber)) {
    throw new DiffParserError(`Malformed diff hunk, expected a number for toRange start line: ${line}`)
  }

  return toRangeStartLineNumber
}
