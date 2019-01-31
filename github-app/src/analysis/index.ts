// Base module for all analysis

export const analyzeCommitDiffAndSubmitStatus = (
  retrieveDiff: () => Promise<any>,
  retrieveFile: (path: string) => Promise<any>,
  setStatus: (statusState: "success" | "failure") => Promise<any>
): Promise<void> => {
  console.log("running diff...")
  return Promise.resolve();
}
