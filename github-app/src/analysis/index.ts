// Base module for all analysis

import R from "ramda"

import { Diff, parseDiff } from "./diff-parser"
import { DiffWithFiles, getFileReview } from "./tag-parser"
import { LanguageParserError, extractFileType } from "./languages/index"
import { ProbotAppError } from "../error"

/** EXTERNAL FUNCTIONS */

// TODO DOC
// @THROWS TODO
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, newFilePath: string) => Promise<[string, string]>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {

  const fullDiff: Diff = parseDiff(await retrieveDiff())

  // Keep only the languages we support
  const analyzableDiff: Diff = R.filter(
    (fileDiff) => {
      try {
        extractFileType(fileDiff.filePath)
        return true
      } catch ( err ) {
        if (err instanceof LanguageParserError) {
          switch (err.type) {

            case "unsupported-extension":
              return false;

            case "unsupported-file":
              return false;
          }

          // Otherwise propogate error
          throw err;
        }

        // Otherwise propogate error
        throw err;
      }
    },
    fullDiff
  )

  // Nothing to analyze
  if (analyzableDiff.length === 0) {
    setStatus("success")
    return
  }

  let diffWFs: DiffWithFiles[];

  // Fetch all files needed for analysis
  try {
    diffWFs = await Promise.all(analyzableDiff.map(async (fileDiff): Promise<DiffWithFiles> => {

      let previousFileContent;
      let fileContent;

      switch (fileDiff.diffType) {

        case "modified":
          [ previousFileContent, fileContent ] = await retrieveFiles(fileDiff.filePath, fileDiff.filePath)
          return R.merge(fileDiff, {  previousFileContent, fileContent })

        case "renamed":
          [ previousFileContent, fileContent ] = await retrieveFiles(fileDiff.filePath, fileDiff.newFilePath)
          return R.merge(fileDiff, { previousFileContent, fileContent })

        case "deleted":
          return fileDiff

        case "new":
          return fileDiff
      }

    }))

  } catch (err) {
    throw new ProbotAppError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

  // Analyze all files
  const fileReviews = diffWFs.map(getFileReview)
  console.log(`Tags needing approval: ${JSON.stringify(fileReviews)}`)

  return
}
