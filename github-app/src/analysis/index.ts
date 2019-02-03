// Base module for all analysis

import R from "ramda"

import { Diff, parseDiff } from "./diff-parser"
import { Language, LanguageParserError, extractFileType } from "./languages/index"

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
        extractFileType(fileDiff.fileName)
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

  // Otherwise we have to analyze each file
  // TODO
  return
}
