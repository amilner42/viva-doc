// Top level module for all analysis.

import R from "ramda"

import * as Diff from "./diff-parser"
import * as Tag from "./tag-parser"
import * as Review from "./review"
import * as Lang from "./languages/index"
import * as AppError from "../error"

/** EXTERNAL FUNCTIONS */

// TODO DOC
// @THROWS TODO
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, newFilePath: string) => Promise<[string, string]>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff())

  // Keep only the languages we support
  const filesDiffsToAnalyze: Diff.FileDiff[] = R.filter(
    (fileDiff) => {
      try {
        Lang.extractFileType(fileDiff.filePath)
        return true
      } catch ( err ) {
        if (err instanceof Lang.LanguageParserError) {
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
    fileDiffs
  )

  // No files to analyze
  if (filesDiffsToAnalyze.length === 0) {
    setStatus("success")
    return
  }

  let fileDiffsWithCode: Tag.FileDiffWithCode[];

  // Fetch all files needed for analysis
  try {
    fileDiffsWithCode = await Promise.all(filesDiffsToAnalyze.map(async (fileDiff): Promise<Tag.FileDiffWithCode> => {

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
    throw new AppError.ProbotAppError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

  // An array of reviews for each file.
  const fileReviews = R.pipe(
    R.map(Tag.parseTags),
    R.map(Review.getReviews)
  )(fileDiffsWithCode)

  console.log(`${JSON.stringify(fileReviews)}`)

  return
}
