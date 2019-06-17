import mongoose = require("mongoose")

import { TagAndOwner } from "../review";
import * as AppError from "../error";


export interface PullRequestReview {
  repoId: number,
  repoName: string,
  repoFullName: string,
  branchName: string,
  baseBranchName: string,
  pullRequestId: number,
  pullRequestNumber: number,
  headCommitId: string,
  headCommitApprovedTags: string[] | null,
  headCommitRejectedTags: string[] | null,
  headCommitRemainingOwnersToApproveDocs: string[] | null,
  headCommitTagsAndOwners: TagAndOwner[] | null,
  pendingAnalysisForCommits: string[],
  currentAnalysisLastCommitWithSuccessStatus: string,
  currentAnalysisLastAnalyzedCommit: string | null,
  loadingHeadAnalysis: boolean
}

const PullRequestReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  baseBranchName: { type: String, required: [true, "can't be blank"] },
  pullRequestId: { type: Number, required: [true, "can't be blank" ] },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"], index: true },
  headCommitId: { type: String, required: [true, "can't be blank"], index: true },
  headCommitApprovedTags: { type: [ String ] },
  headCommitRejectedTags: { type: [String ] },
  headCommitRemainingOwnersToApproveDocs: { type: [ String ] },
  headCommitTagsAndOwners: { type: [ { owner: String, tagId: String }]},
  pendingAnalysisForCommits: { type: [ String ], required: [ true, "can't be blank"] },
  currentAnalysisLastCommitWithSuccessStatus: { type: String, required: [ true, "can't be blank" ] },
  currentAnalysisLastAnalyzedCommit: { type: String },
  loadingHeadAnalysis: { type: Boolean, required: [true, "can't be blank"] }
});


const PullRequestReviewModel = mongoose.model("PullRequestReview", PullRequestReviewSchema);


// Deletes all PullRequestReviews which have a repoId in `repoIds`.
// @THROWS only `GithubAppLoggableError` upon failed deletion.
export const deletePullRequestReviewsForRepos =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ) : Promise<void> => {

  try {

    const deletePullRequestReviewsResult =
      await PullRequestReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

    if (deletePullRequestReviewsResult.ok !== 1) {
      throw `delete pull request result not ok: ${deletePullRequestReviewsResult.ok}`;
    }

  } catch (err) {

    const deletePullRequestReviewLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack()
    }

    throw deletePullRequestReviewLoggableError;
  }

}


// Adds a commit ID to the pending analysis, and updates all `headXXX` fields.
// @RETURNS The previous pull request object (prior to update).
// @THROWS only `GithubAppLoggableError` upon failure.
export const updateHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
        , errorName: string
        ): Promise<PullRequestReview> => {

  try {

    const pullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $push: { "pendingAnalysisForCommits": headCommitId },
        headCommitId: headCommitId,
        headCommitApprovedTags: null,
        headCommitRejectedTags: null,
        headCommitRemainingOwnersToApproveDocs: null,
        headCommitTagsAndOwners: null,
        loadingHeadAnalysis: true
      },
      {
        new: false
      }
    ).exec();

    if (pullRequestReview === null) {
      const errMessage =
        `Missing PullRequestReview object for --- repoId: ${repoId}, prNumber: ${pullRequestNumber}`

      throw errMessage;
    }

    return pullRequestReview.toObject();

  } catch (err) {

    const updateHeadCommitOnPullRequestReviewLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack()
    }

    throw updateHeadCommitOnPullRequestReviewLoggableError;
  }

}


export const isAnalyzingCommits = (pullRequestReview: PullRequestReview): boolean => {
  return pullRequestReview.pendingAnalysisForCommits.length !== 0;
}
