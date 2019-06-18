import mongoose = require("mongoose")

import { TagAndOwner } from "../review";
import * as AppError from "../error";
import * as F from "../functional";
import * as Review from "../review";

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
  loadingHeadAnalysis: boolean,
  failedToSaveCommitReviews: string[]
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
  loadingHeadAnalysis: { type: Boolean, required: [true, "can't be blank"] },
  failedToSaveCommitReviews: { type:  [ String ], required: [true, "can't be blank"] }
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
      loadingHeadAnalysis: true,
      failedToSaveCommitReviews: [],
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


// Updates the fields that are not for the head commit of the PRReview and returns the new PRReview.
//
// @THROWS only `GithubAppLoggableError` upon failure.
export const updateNonHeadCommitFields =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , analyzedCommitId: string
        , lastCommitWithSuccessStatus: string
        ): Promise<PullRequestReview> => {

  try {

    const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $pull: { pendingAnalysisForCommits: analyzedCommitId },
        currentAnalysisLastCommitWithSuccessStatus: lastCommitWithSuccessStatus,
        currentAnalysisLastAnalyzedCommit: analyzedCommitId
      },
      {
        new: true
      }
    ).exec();

    if (updatedPullRequestReview === null) {
      throw `Failed to find pull request review`
    }

    return updatedPullRequestReview.toObject();

  } catch (err) {

    const updatePullRequestLoggableError: AppError.GithubAppLoggableError = {
      errorName: "update-non-head-fields-on-pr-failed",
      githubAppError: true,
      loggable: true,
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        analyzedCommitId
      }
    };

    throw updatePullRequestLoggableError;
  }

}


// Updates the fields in a PRReview assuming it is still the head commit.
//
// If it worked, returns "success", if it was no longer the head commit, returns "no-longer-head-commit".
//
// @THROWS `GithubAppLoggableError` if the mongo query failed to execute properly.
export const updateFieldsForHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
        , headCommitApprovedTags: string[]
        , headCommitRejectedTags: string[]
        , headCommitRemainingOwnersToApproveDocs: string[]
        , headCommitTagsAndOwners: Review.TagAndOwner[]
        , currentAnalysisLastCommitWithSuccessStatus: string
        , currentAnalysisLastAnalyzedCommit: string
        ): Promise<"success" | "no-longer-head-commit"> => {

  try {

    const updatePullRequestReviewResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId
      },
      {
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitRemainingOwnersToApproveDocs,
        headCommitTagsAndOwners,
        $pull: { pendingAnalysisForCommits: currentAnalysisLastAnalyzedCommit },
        currentAnalysisLastCommitWithSuccessStatus,
        currentAnalysisLastAnalyzedCommit,
        loadingHeadAnalysis: false
      }
    ).exec();

    if (updatePullRequestReviewResult.ok !== 1) {
      throw `mongo query was not ok: ${updatePullRequestReviewResult.ok}`;
    }

    if (updatePullRequestReviewResult.n === 1 && updatePullRequestReviewResult.nModified === 1) {
      return "success";
    }
    return "no-longer-head-commit";

  } catch (err) {

    const updatePRLoggableError: AppError.GithubAppLoggableError = {
      errorName: "update-pr-head-commit-fields-failure",
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        headCommitId
      }
    };

    throw updatePRLoggableError;
  }
}


// Clears a commit from the `pendingAnalysisForCommits` and optionally add it to `failedToSaveCommitReviews`.
//
// @THROWS
//  if `andThrowError` is not null then it will always throw, either:
//   - Just `andThrowError` if successfully cleared pending commit.
//   - Array with [ `andThrowError`, `GithubAppLoggableError` from the failure ]
// else:
//    will throw `GithubAppLoggableError` if it errors to clear the pending commit.
export const clearPendingCommitOnAnalysisFailure =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , commitId: string
        , failedToSaveCommitReview: boolean
        , andThrowError: F.Maybe<any>
      ): Promise<PullRequestReview>  => {

  let pullRequestReviewDoc: mongoose.Document | null;

  try {

    const updateFields =
      failedToSaveCommitReview
        ? {
            $pull: { pendingAnalysisForCommits: commitId },
            $addToSet: { "failedToSaveCommitReviews": commitId }
          }
        : {
            $pull: { pendingAnalysisForCommits: commitId }
          }

    pullRequestReviewDoc = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      updateFields
    ).exec();

    if (pullRequestReviewDoc === null) {
      throw `Unable to find pull request review.`
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

    if (andThrowError !== null) {
      throw [ andThrowError, clearPendingAnalysisOnFailureLoggableError ];
    } else {
      throw clearPendingAnalysisOnFailureLoggableError;
    }
  }

  if (andThrowError !== null) {
    throw andThrowError;
  }

  return pullRequestReviewDoc.toObject();
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
