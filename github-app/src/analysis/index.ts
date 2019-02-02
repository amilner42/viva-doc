// Base module for all analysis

import { Diff, ParseDiffError, parseDiff } from "./diff-parser"

// @PROD This is the prototype-version, doesn't handle errors great
// In prod we'll probably need to save things to a db in case of error and retry later.
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFile: (path: string) => Promise<any>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {

  let diffAsStr: string;

  try {
    diffAsStr = await retrieveDiff()
    console.log(`Diff: ${diffAsStr}`)
  } catch (err) {
    // @PROD handle this error properly
    console.log(`failure to retreive diff: ${JSON.stringify(err)}`)
    return;
  }

  let diff: Diff;

  try {
    diff = parseDiff(diffAsStr)
    console.log(`Parsed Diff: ${JSON.stringify(diff)}`)
  } catch (err) {
    // @PROD handle this error properly
    console.log(`Hit err: ${err}  --- ${JSON.stringify(err)}`)
    return;
  }

  // console.log(`Diff: ${JSON.stringify(diff)}`)

  return Promise.resolve();
}
