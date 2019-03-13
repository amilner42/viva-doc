// Top level module for all analysis.

import R from "ramda"

import * as Diff from "./diff"
import * as Tag from "./tag-parser"
import * as Review from "./review"
import * as Lang from "./languages/index"
import * as AppError from "./error"

/** EXTERNAL FUNCTIONS */

// TODO DOC
// @THROWS TODO
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff())

  // Keep only the languages we support
  const filesDiffsToAnalyze: Diff.FileDiff[] = R.filter(
    (fileDiff) => {
      try {
        // TODO does this make sense on with diffType = rename?
        Lang.extractFileType(fileDiff.currentFilePath)
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
      let currentFileContent;

      switch (fileDiff.diffType) {

        case "modified":
          [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.currentFilePath, fileDiff.currentFilePath)
          return R.merge(fileDiff, {  previousFileContent, currentFileContent })

        case "renamed":
          [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.previousFilePath, fileDiff.currentFilePath)
          return R.merge(fileDiff, { previousFileContent, currentFileContent })

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
