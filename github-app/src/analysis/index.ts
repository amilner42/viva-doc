// Base module for all analysis

import R from "ramda"

import { Diff, FileDiff, parseDiff } from "./diff-parser"
import { File, analyzeFile } from "./file-parser"
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

  let files: File[];

  // Fetch all files needed for analysis
  try {
    files = await Promise.all(analyzableDiff.map(async (fileDiff) => {
      let content = await retrieveFile(fileDiff.filePath)
      return R.merge({ content }, fileDiff)
    }))
  } catch (err) {
    throw new AnalysisError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

  // Analyze all files
  const fileAnalysisResults = files.map(analyzeFile)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileAnalysis = fileAnalysisResults[i]

    console.log(`File         : ${JSON.stringify(file)}`)
    console.log(`File analysis: ${JSON.stringify(fileAnalysis)}`)
  }

  return
}
