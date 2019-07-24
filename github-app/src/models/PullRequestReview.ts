import mongoose = require("mongoose")

import * as R from "ramda";
import * as AppError from "../error";
import * as F from "../functional";
import * as UA from "../user-assessment";
import * as TOG from "../tag-owner-group";

import * as CommitReviewModel from "./CommitReview";


export interface PullRequestReview {
  repoId: number,
  repoName: string,
  repoFullName: string,
  branchName: string,
  baseBranchName: string,
  baseCommitId: string,
  pullRequestId: number,
  pullRequestNumber: number,
  headCommitId: string,
  headCommitApprovedTags: string[] | null,
  headCommitRejectedTags: string[] | null,
  headCommitUserAssessments: UA.UserAssessment[] | null,
  headCommitTagsOwnerGroups: TOG.TagOwnerGroups[] | null,
  pendingAnalysisForCommits: { head: string, base: string }[],
  analyzedCommitsWithSuccessStatus: string[],
  analyzedCommits: string[],
  commitReviewErrors: CommitReviewError[]
}


// Errors on commit reviews with a possbile `clientExplanation` meant to be rendered to the user.
//
// @VD amilner42 block
export interface CommitReviewError {
  commitReviewError: true;
  commitId: string;
  failedToSaveCommitReview: boolean;
  clientExplanation: string;
}
// @VD end-block


const PullRequestReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  baseBranchName: { type: String, required: [true, "can't be blank"] },
  baseCommitId: { type: String, required: [true, "can't be blank"] },
  pullRequestId: { type: Number, required: [true, "can't be blank" ] },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"], index: true },
  headCommitId: { type: String, required: [true, "can't be blank"], index: true },
  headCommitApprovedTags: { type: [ String ] },
  headCommitRejectedTags: { type: [String ] },
  headCommitUserAssessments: { type: [ { username: String, tagId: String, assessmentType: String } ] },
  headCommitTagsOwnerGroups: { type: [ { tagId: String, groups: [ [ String ] ] } ] },
  pendingAnalysisForCommits: { type: [ { head: String, base: String } ], required: [ true, "can't be blank"] },
  analyzedCommitsWithSuccessStatus: { type: [ String ], required: [ true, "can't be blank" ] },
  analyzedCommits: { type: [ String ], required: [ true, "can't be blank"] },
  commitReviewErrors: { type:  [ mongoose.Schema.Types.Mixed ], required: [true, "can't be blank"] }
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
      baseCommitId,
      pullRequestId,
      pullRequestNumber,
      headCommitId,
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitUserAssessments: null,
      headCommitTagsOwnerGroups: null,
      pendingAnalysisForCommits: [ { head: headCommitId, base: baseCommitId } ],
      analyzedCommitsWithSuccessStatus: [],
      analyzedCommits: [],
      commitReviewErrors: [],
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


// Handles updating the PullRequestReview for a call from the PR sync webhook.
//
// @RETURNS The previous (prior to update) and new pull request object.
// @THROWS only `GithubAppLoggableError` upon failure.
export const updateOnPullRequestSync =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
        , baseCommitId: string
      ): Promise<{ previousPullRequestReviewObject: PullRequestReview, newPullRequestReviewObject: PullRequestReview }> => {

  try {

    // In case of rebase we may need to fetch old commit review fields if theyve already been calculated.
    const { headCommitApprovedTags
          , headCommitRejectedTags
          , headCommitUserAssessments
          , headCommitTagsOwnerGroups } =
      await CommitReviewModel.getPullRequestReviewHeadXXXDataFromPossiblyExistantCommitReview(
        installationId,
        repoId,
        headCommitId
      );

    const pullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $push: { "pendingAnalysisForCommits": { head: headCommitId, base: baseCommitId } },
        headCommitId: headCommitId,
        baseCommitId: baseCommitId,
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups,
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

    const previousPullRequestReviewObject: PullRequestReview = pullRequestReview.toObject();

    const newPullRequestReviewObject: PullRequestReview = {
      ...previousPullRequestReviewObject,
      ...{
        headCommitId,
        baseCommitId,
        pendingAnalysisForCommits: previousPullRequestReviewObject.pendingAnalysisForCommits.concat(
          { head: headCommitId, base: baseCommitId }
        ),
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups
      }
    }

    return { previousPullRequestReviewObject, newPullRequestReviewObject };

  } catch (err) {

    const updateHeadCommitOnPullRequestReviewLoggableError: AppError.GithubAppLoggableError = {
      errorName: "update-pull-request-review-sync-failure",
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


// Updates the PullRequestReview given that the analysis completed for a commit that is no longer the head commit.
//
// @THROWS only `GithubAppLoggableError` upon failure.
export const updateOnCompleteAnalysisForNonHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , analyzedCommitId: string
        , currentCommitIsSuccess: boolean
        ): Promise<PullRequestReview> => {

  const mongoPushObject =
    currentCommitIsSuccess
      ? { "analyzedCommits": analyzedCommitId, "analyzedCommitsWithSuccessStatus": analyzedCommitId }
      : { "analyzedCommits": analyzedCommitId  }

  try {

    const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $pull: { pendingAnalysisForCommits: { head: analyzedCommitId } },
        $push: mongoPushObject
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


// Updates the PullRequestReview assuming it is still the head commit.
//
// If it worked, returns "success", if it was no longer the head commit, returns "no-longer-head-commit".
//
// @THROWS `GithubAppLoggableError` if the mongo query failed to execute properly.
export const updateOnCompleteAnalysisForHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
        , headCommitApprovedTags: string[]
        , headCommitRejectedTags: string[]
        , headCommitUserAssessments: UA.UserAssessment[]
        , headCommitTagsOwnerGroups: TOG.TagOwnerGroups[]
        ): Promise<"success" | "no-longer-head-commit"> => {

  try {

    const totalNumberOfTags = headCommitTagsOwnerGroups.length;
    const currentCommitIsSuccess = headCommitApprovedTags.length === totalNumberOfTags;

    const mongoPushObject =
      currentCommitIsSuccess
        ? { analyzedCommits: headCommitId, analyzedCommitsWithSuccessStatus: headCommitId }
        : { analyzedCommits: headCommitId }

    const updatePullRequestReviewResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId
      },
      {
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups,
        $pull: { pendingAnalysisForCommits: { head: headCommitId } },
        $push: mongoPushObject
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


// Clears a commit from the `pendingAnalysisForCommits` and optionally add err to `commitReviewErrors`.
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
        , commitReviewError: F.Maybe<CommitReviewError>
        , andThrowError: F.Maybe<any>
      ): Promise<PullRequestReview>  => {

  let pullRequestReviewDoc: mongoose.Document | null;

  try {

    const updateFields =
      commitReviewError !== null
        ? {
            $pull: { pendingAnalysisForCommits: { head: commitId } },
            $addToSet: { "commitReviewErrors": commitReviewError }
          }
        : {
            $pull: { pendingAnalysisForCommits: { head: commitId } }
          }

    pullRequestReviewDoc = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      updateFields,
      { new: true }
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


export const clearPendingCommitOnAnalysisSkip =
  async (installationId: number
  , repoId: number
  , pullRequestNumber: number
  , commitId: string
  ): Promise<PullRequestReview>=> {

  try {

    const newPullRequestReviewDoc = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      { $pull: { pendingAnalysisForCommits: { head: commitId } } },
      { new: true }
    );

    if (newPullRequestReviewDoc === null) {
      throw `Unable to find pull request review.`
    }

    return newPullRequestReviewDoc.toObject();

  } catch (err) {

    const clearPendingCommitOnAnalysisSkipLoggableError: AppError.GithubAppLoggableError = {
      errorName: "clear-pending-commit-on-analysis-skip-failure",
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

    throw clearPendingCommitOnAnalysisSkipLoggableError;
  }
}


export const isAnalyzingCommits = (pullRequestReview: PullRequestReview): boolean => {
  return pullRequestReview.pendingAnalysisForCommits.length !== 0;
}


export const getErrorForCommitReview =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): F.Maybe<CommitReviewError> => {

  const err = R.find(R.propEq("commitId", commitId), pullRequestReview.commitReviewErrors);

  if (err === undefined) { return null; }

  return err;
}


export const hasErrorForCommitReview =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): boolean => {

  const err = getErrorForCommitReview(pullRequestReview, commitId);

  return F.isJust(err);
}


export const commitSavedSuccessfully =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): boolean => {

  const err = getErrorForCommitReview(pullRequestReview, commitId);

  if (err === null) { return true; }

  return !err.failedToSaveCommitReview;
}


export const COMMIT_REVIEW_ERROR_MESSAGES = {
  internal: "An internal error occurred, Arie has been notified to review the problem.",
  githubIssue: "The github API was not responding to our queries so we couldn't analyze this commit..."
}
