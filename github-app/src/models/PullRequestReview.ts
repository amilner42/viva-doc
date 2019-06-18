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


// @THROWS `GithubAppLoggableError` if upon failure to create new PRReview.
export const newPullRequestReview =
  async ( installationId: number
        , repoId: number
        , repoName: string
        , repoFullName: string
        , branchName: string
        , baseBranchName: string
        , pullRequestId: number
        , pullRequestNumber: number
        , headCommitId: string
        , baseCommitId: string
      ): Promise<PullRequestReview> => {

  try {

    const pullRequestReviewObject: PullRequestReview = {
      repoId,
      repoName,
      repoFullName,
      branchName,
      baseBranchName,
      pullRequestId,
      pullRequestNumber,
      headCommitId,
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitRemainingOwnersToApproveDocs: null,
      headCommitTagsAndOwners: null,
      pendingAnalysisForCommits: [ headCommitId ],
      currentAnalysisLastCommitWithSuccessStatus: baseCommitId,
      currentAnalysisLastAnalyzedCommit: null,
      loadingHeadAnalysis: true
    };

    const pullRequestReview = new PullRequestReviewModel(pullRequestReviewObject);

    await pullRequestReview.save();

    return pullRequestReviewObject;

  } catch (err) {

    const newPRLoggableError: AppError.GithubAppLoggableError = {
      errorName: "create-new-pull-request-failure",
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        repoName,
        repoFullName,
        branchName,
        baseBranchName,
        pullRequestId,
        pullRequestNumber,
        headCommitId
      }
    };

    throw newPRLoggableError;
  }

}


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


// @THROWS `GithubApp.LoggableError` upon failure to clear pending commit.
export const clearPendingCommitOnAnalysisFailure =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , commitId: string
        ): Promise<void>  => {

  try {

    const updateResult = await PullRequestReviewModel.update(
      { repoId, pullRequestNumber },
      {
        $pull: { pendingAnalysisForCommits: commitId },
      }
    ).exec();

    if (updateResult.ok !== 1 || updateResult.n !== 1 || updateResult.nModified !== 1) {
      throw { updateQueryFailure: true
            , ok: updateResult.ok
            , n: updateResult.n
            , nModified: updateResult.nModified
            }
    }

  } catch (err) {

    const clearPendingAnalysisOnFailureLoggableError: AppError.GithubAppLoggableError = {
      errorName: "clear-pending-analysis-on-analysis-failure-failure",
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        commitId
      }
    };

    throw clearPendingAnalysisOnFailureLoggableError;
  }

}


export const isAnalyzingCommits = (pullRequestReview: PullRequestReview): boolean => {
  return pullRequestReview.pendingAnalysisForCommits.length !== 0;
}


export const newLoadingPullRequestReviewFromPrevious =
  ( previousPullRequestReviewObject: PullRequestReview
  , headCommitId: string
  , pendingAnalysisForCommits: string[]
  ): PullRequestReview => {

  return {
    ...previousPullRequestReviewObject,
    ...{
      headCommitId,
      pendingAnalysisForCommits,
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitRemainingOwnersToApproveDocs: null,
      headCommitTagsAndOwners: null,
      loadingHeadAnalysis: true
    },
  ...{
      // An unlikely race condition, but just in case, if the last commit had no remaining owners to approve dos
      // then it is the last success commit. Because first that is pulled and then only after is success set
      // there is a chance this runs between the 2 db operations.
      currentAnalysisLastCommitWithSuccessStatus:
        (previousPullRequestReviewObject.headCommitRemainingOwnersToApproveDocs === [])
          ? previousPullRequestReviewObject.headCommitId
          : previousPullRequestReviewObject.currentAnalysisLastCommitWithSuccessStatus
    }
  }

}
