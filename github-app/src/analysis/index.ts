// Base module for all analysis

import R from "ramda"

import { Diff, parseDiff } from "./diff-parser"
import { Language, LanguageParserError, extractFileType } from "./languages/index"
import { AnalysisError } from "./error"

// TODO DOC
// @THROWS TODO
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFile: (path: string) => Promise<any>,
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

  let files: string[];

  // Fetch all files needed for analysis
  try {
    files = await Promise.all(analyzableDiff.map((fileDiff) => {
      return retrieveFile(fileDiff.filePath)
    }))
  } catch (err) {
    throw new AnalysisError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

  return
}
