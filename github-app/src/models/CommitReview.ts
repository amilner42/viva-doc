import mongoose = require("mongoose")

import { FileReviewWithMetadata, TagAndOwner } from "../review";
import * as AppError from "../error";


export interface CommitReview {
  repoId: number,
  repoName: string,
  repoFullName: string,
  branchName: string,
  commitId: string,
  pullRequestNumber: number,
  fileReviews: FileReviewWithMetadata[],
  approvedTags: string[],
  rejectedTags: string[],
  remainingOwnersToApproveDocs: string[],
  tagsAndOwners: TagAndOwner[],
}

const CommitReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"], index: true },
  repoFullName: { type: String, required: [true, "can't be blank"], index: true },
  branchName: { type: String, required: [true, "can't be blank"], index: true },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"] },
  fileReviews: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  approvedTags: { type: [ String ], required: [true, "can't be blank"] },
  rejectedTags: { type: [ String ], required: [true, "can't be blank"] },
  remainingOwnersToApproveDocs: { type: [ String ], required: [true, "can't be blank"] },
  tagsAndOwners: { type: [ { owner: String, tagId: String } ], required: [true, "can't be blank"]},
});


const CommitReviewModel = mongoose.model("CommitReview", CommitReviewSchema);


/* DB HELPER FUNCTIONS */


// Saves a new commit review.
//
// @THROWS `GithubAppLoggableError` upon failure to save new commit.
export const newCommitReview = async (installationId: number, commitReviewObject: CommitReview): Promise<void> => {

  try {
    const commitReview = new CommitReviewModel(commitReviewObject);
    await commitReview.save();

  } catch (err) {

    const saveCommitLoggableError: AppError.GithubAppLoggableError = {
      errorName: "save-new-commit-review-failure",
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        commitReviewObject
      }
    }

    throw saveCommitLoggableError;
  }

}


// Retrieve a commit review that should already exist.
//
// @THROWS `GithubAppLoggableError` upon failure to find/retrieve commit review.
export const getExistantCommitReview = async (installationId: number, repoId: number, commitId: string): Promise<CommitReview> => {

  try {

    const commitReview = await CommitReviewModel.findOne({ repoId, commitId }).exec();

    if (commitReview === null) {
      throw "Query executed but commit review not found";
    }

    return commitReview.toObject();

  } catch (err) {
    throw ""
  }

}


// Delete commit reviews which have a repoId in `repoIds`.
// @THROWS only `GithubAppLoggableError` upon failed deletion.
export const deleteCommitReviewsForRepos =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ): Promise<void> => {

  try {

    const deleteCommitReviewsResult = await CommitReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

    if (deleteCommitReviewsResult.ok !== 1) {
      throw `delete commit review result not ok: ${deleteCommitReviewsResult.ok}`;
    }

  } catch (err) {

    const deleteCommitReviewsLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: err
    }

    throw deleteCommitReviewsLoggableError;
  }

}


// Save some data to a commit review.
//
// @THROWS only `GithubAppLoggableError` upon failed update.
export const updateCommitReview =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , commitId: string
        , finalApprovedTags: string[]
        , finalRejectedTags: string[]
        , finalRemainingOwnersToApproveDocs: string[]
        , errorName: string
        ) => {

  try {

    const commitReviewUpdateResult = await CommitReviewModel.update(
      { repoId, pullRequestNumber, commitId },
      {
        approvedTags: finalApprovedTags,
        rejectedTags: finalRejectedTags,
        remainingOwnersToApproveDocs: finalRemainingOwnersToApproveDocs,
      }
    ).exec();

    if ( commitReviewUpdateResult.ok !== 1
          || commitReviewUpdateResult.n !== 1
          || commitReviewUpdateResult.nModified !== 1 ) {

      throw { updateQueryFailure: true
            , ok: commitReviewUpdateResult.ok
            , n: commitReviewUpdateResult.n
            , nModified: commitReviewUpdateResult.nModified
            }
    }

  } catch (err) {

    const updateCommitReviewLoggableError: AppError.GithubAppLoggableError = {
      errorName,
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

    throw updateCommitReviewLoggableError;
  }

}
