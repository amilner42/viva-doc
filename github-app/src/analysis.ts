// Top level module for the analysis pipeline.

import R from "ramda"

import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as Lang from "./languages/index"
import * as AppError from "./error"

import mongoose from "mongoose"
const PullRequestReviewModel = mongoose.model("PullRequestReview")
import { PullRequestReview } from "./models/PullRequestReview"
const CommitReviewModel = mongoose.model("CommitReview")
import { CommitReview } from "./models/CommitReview"


// TODO DOC
// TODO handle errors
export const pipeline = async (
  pullRequestReview: PullRequestReview,
  getClientUrlForCommitReview: (commitId: string) => string,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) {
    console.log("Nothing to analyze...")
    return
  }

  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0]
  const baseCommitId = pullRequestReview.currentAnalysisLastCommitWithSuccessStatus

  await setCommitStatus(
    analyzingCommitId,
    "pending",
    { description: `Analyzing documentation against ${pullRequestReview.baseBranchName} branch...` }
  )

  const fileReviewsNeedingApproval = await
    getFileReviewsWithMetadataNeedingApproval(
      async () => { return retrieveDiff(baseCommitId, analyzingCommitId) },
      async (previousfilePath: string, currentFilePath: string): Promise<[string, string]> => {
        const previousFileContent = await retrieveFile(baseCommitId, previousfilePath)
        const currentFileContent = await retrieveFile(analyzingCommitId, currentFilePath)

        return [ previousFileContent, currentFileContent ]
      }
    )

  // The following 4 steps should be performed in this order.

  // 1. Save new CommitReview

  const owners = Review.getAllOwners(fileReviewsNeedingApproval)
  const tagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsNeedingApproval)
  const approvedTags: string[] = [] /* TODO CALCULATE CARRY-OVERS */
  const rejectedTags: string[] = [] /* TODO CALCULATE CARRY-OVERS */
  const remainingOwnersToApproveDocs: string[] = owners /* TODO CALCULATE CARRY-OVERS */
  const lastCommitWithSuccessStatus =
    remainingOwnersToApproveDocs.length === 0
      ? analyzingCommitId
      : pullRequestReview.currentAnalysisLastCommitWithSuccessStatus


  const commitReviewObject: CommitReview = {
    repoId: pullRequestReview.repoId,
    repoFullName: pullRequestReview.repoFullName,
    branchName: pullRequestReview.branchName,
    commitId: analyzingCommitId,
    pullRequestNumber: pullRequestReview.pullRequestNumber,
    fileReviews: fileReviewsNeedingApproval,
    approvedTags,
    rejectedTags,
    remainingOwnersToApproveDocs,
    tagsAndOwners
  }

  const commitReview = new CommitReviewModel(commitReviewObject)
  await commitReview.save()

  // 2. Update PullRequestReview

  let updatedPullRequestReview: mongoose.Document | null;

  // First attempt to atomically update assuming this commit is still the most recent commit in the PR.
  updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
    {
      repoId: pullRequestReview.repoId,
      pullRequestNumber: pullRequestReview.pullRequestNumber,
      headCommitId: analyzingCommitId
    },
    {
      headCommitApprovedTags: approvedTags,
      headCommitRejectedTags: rejectedTags,
      headCommitRemainingOwnersToApproveDocs: remainingOwnersToApproveDocs,
      headCommitTagsAndOwners: tagsAndOwners,
      $pull: { pendingAnalysisForCommits: analyzingCommitId },
      currentAnalysisLastCommitWithSuccessStatus: lastCommitWithSuccessStatus,
      currentAnalysisLastAnalyzedCommit: analyzingCommitId
    },
    {
      new: true
    }
  ).exec()

  // Atomic update failed because this is no longer the head commit, perform update on non headCommitXXX fields.
  if (updatedPullRequestReview === null) {

    updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      {
        repoId: pullRequestReview.repoId,
        pullRequestNumber: pullRequestReview.pullRequestNumber
      },
      {
        $pull: { pendingAnalysisForCommits: analyzingCommitId },
        currentAnalysisLastCommitWithSuccessStatus: lastCommitWithSuccessStatus,
        currentAnalysisLastAnalyzedCommit: analyzingCommitId
      },
      {
        new: true
      }
    )
  }

  if (updatedPullRequestReview === null) {
    throw new Error(`Error : Could not update pull request review with fields --- repoId : ${pullRequestReview.repoId}, pullRequestNumber: ${pullRequestReview.pullRequestNumber}`)
  }

  // 3. Set commit status

  if (lastCommitWithSuccessStatus === analyzingCommitId) {
    await setCommitStatus(analyzingCommitId, "success", { description: "No tags required approval" })
  } else {
    await setCommitStatus(
      analyzingCommitId,
      "failure",
      { description: "Tags require approval", target_url: getClientUrlForCommitReview(analyzingCommitId) }
    )
  }

  // 4. Recurse pipeline if needed

  const updatedPullRequestReviewObject: PullRequestReview = updatedPullRequestReview.toObject()

  if (updatedPullRequestReviewObject.pendingAnalysisForCommits.length > 0) {
    pipeline(
      updatedPullRequestReviewObject,
      getClientUrlForCommitReview,
      retrieveDiff,
      retrieveFile,
      setCommitStatus
    )
  }

}


export const getFileReviewsWithMetadataNeedingApproval = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
): Promise<Review.FileReviewWithMetadata[]> => {

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
    return []
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
  const fileReviews: Review.FileReviewWithMetadata[] =
    R.pipe<
      Tag.FileDiffWithCode[],
      Tag.FileDiffWithCodeAndTags[],
      Review.FileReview[],
      Review.FileReview[],
      Review.FileReviewWithMetadata[]
    >(
      R.map(Tag.parseTags),
      R.map(Review.getReviews),
      R.filter(Review.fileReviewNeedsApproval),
      R.map(Review.initFileReviewMetadata)
    )(fileDiffsWithCode)

  return fileReviews;
}
