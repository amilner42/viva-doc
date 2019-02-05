// Base module for all analysis

import R from "ramda"

import { Diff, parseDiff } from "./diff-parser"
import { AnalyzeFileParams, analyzeFile } from "./tag-parser"
import { LanguageParserError, extractFileType } from "./languages/index"
import { AnalysisError } from "./error"

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

  let fileAnalysisParamsArray: AnalyzeFileParams[];

  // Fetch all files needed for analysis
  try {
    fileAnalysisParamsArray = await Promise.all(analyzableDiff.map(async (fileDiff): Promise<AnalyzeFileParams> => {

      let previousFileContent;
      let fileContent;

      switch (fileDiff.diffType) {

        case "modified":
          [ previousFileContent, fileContent ] = await retrieveFiles(fileDiff.filePath, fileDiff.filePath)
          return { type: "modified", previousFileContent, fileContent, diff: fileDiff  }

        case "renamed":
          [ previousFileContent, fileContent ] = await retrieveFiles(fileDiff.filePath, fileDiff.newFilePath)
          return { type: "renamed", previousFileContent, fileContent, diff: fileDiff  }


        case "deleted":
          return { type: "deleted", diff: fileDiff }

        case "new":
          return { type: "new", diff: fileDiff }
      }

    }))

  } catch (err) {
    throw new AnalysisError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

  // Analyze all files
  const tagsNeedingApproval = fileAnalysisParamsArray.map(analyzeFile)
  console.log(`Tags needing approval: ${JSON.stringify(tagsNeedingApproval)}`)

  return
}
