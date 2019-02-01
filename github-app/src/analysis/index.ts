// Base module for all analysis

// @PROD This is the prototype-version, doesn't handle errors great
// In prod we'll probably need to save things to a db in case of error and retry later.
export const analyzeCommitDiffAndSubmitStatus = async (
  retrieveDiff: () => Promise<any>,
  retrieveFile: (path: string) => Promise<any>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {

  let diff;
  try {
    diff = await retrieveDiff()
  } catch (err) {
    console.log(`failure to retreive diff: ${JSON.stringify(err)}`)
  }

  console.log(`Diff: ${JSON.stringify(diff)}`)

  return Promise.resolve();
}
