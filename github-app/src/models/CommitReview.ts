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
  frozen: boolean
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
  frozen: { type: Boolean, required: [true, "can't be blank"] }
});


const CommitReviewModel = mongoose.model("CommitReview", CommitReviewSchema);


/* DB HELPER FUNCTIONS */


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


// Freezes a commit with some final data.
//
// @THROWS only `GithubAppLoggableError` upon failed update.
export const freezeCommitReviewWithFinalData =
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
        frozen: true
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

    const freezeCommitReviewLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: true,
      data: err,
      stack: AppError.getStack()
    };

    throw freezeCommitReviewLoggableError;
  }

}
