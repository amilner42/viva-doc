// Module for handling common verification.

import * as R from "ramda";
import Express from "express";

const mongoose = require('mongoose');
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');
const RepoModel = mongoose.model('Repo');

import * as TOG from "../../tag-owner-group";
import * as PullRequestReview from "../../models/PullRequestReview";
import * as Repo from "../../models/Repo";
import * as CommitReview from "../../models/CommitReview";
import * as User from "../../models/User";
import * as GithubApi from "../github-api";
import * as ClientErrors from "../client-errors";


// EXTERNAL


// TODO move
export const getLoggedInUser = (req: Express.Request): User.User => {

  if (!req.user) { throw ClientErrors.notLoggedInError; }

  return req.user;
}


export const hasAccessToRepo = async (user: User.User, repoId: number): Promise<void> => {

  const basicUserData = await GithubApi.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = GithubApi.hasAccessToRepo(basicUserData.repos, repoId);

  if (!hasAccessToRepo) { throw ClientErrors.noAccessToRepoError; }
}


// TODO move
export const getPullRequestReviewObject =
  async ( repoId: number
        , pullRequestNumber: number
        ): Promise<PullRequestReview.PullRequestReview> => {

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    throw ClientErrors.noPullRequestReview;
  }

  return pullRequestReview.toObject();
}


// TODO move
export const getCommitReviewObject =
  async ( repoId: number
        , pullRequestNumber: number
        , commitId: string
        ): Promise<CommitReview.CommitReview> => {

  const commitReview = await CommitReviewModel.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    throw ClientErrors.noCommitReview;
  }

  return commitReview.toObject();
}


// TODO move
export const getRepoObject = async (repoId: number): Promise<Repo.Repo> => {

  const repo = await RepoModel.findOne({ repoIds: repoId }).exec();

  if (repo === null) {
    throw ClientErrors.noRepo;
  }

  return repo.toObject();
}


export const isHeadCommit = (pullRequestReviewObject: PullRequestReview.PullRequestReview, commitId: string): void => {

  if (pullRequestReviewObject.headCommitId !== commitId) {
    throw ClientErrors.noUpdatingNonHeadCommit(pullRequestReviewObject.headCommitId);
  }
}


export const isLoadedHeadCommit = (pullRequestReviewObject: PullRequestReview.PullRequestReview, commitId: string): void => {

  if (pullRequestReviewObject.headCommitId !== commitId) {
    throw ClientErrors.noUpdatingNonHeadCommit(pullRequestReviewObject.headCommitId);
  }

  if ( pullRequestReviewObject.pendingAnalysisForCommits[0] &&
       pullRequestReviewObject.pendingAnalysisForCommits[0].head === commitId ) {
    throw ClientErrors.commitStillLoading;
  }
}


export const ownsTags = (tagsOwnerGroups: TOG.TagOwnerGroups[], tagIds: string[], username: string): void => {

  for (let tagId of tagIds) {

    const tagOwnerGroups = R.find(R.propEq("tagId", tagId), tagsOwnerGroups);

    if (tagOwnerGroups === undefined) {
      throw ClientErrors.noModifyingTagsThatDontExist;
    }

    const userInTagOwnerGroups = R.any(R.contains<string>(username), tagOwnerGroups.groups);

    if (!userInTagOwnerGroups) {
      throw ClientErrors.noModifyingTagsYouDontOwn;
    }
  }

}


export const assessmentsAreForDifferentTags = (tagIds: string[]): void => {

  if (R.uniq(tagIds).length !== tagIds.length) {
    throw ClientErrors.userAssmentsMustBeToUniqueTags;
  }
}


export const isArrayOfString = (val: any, err: ClientErrors.ClientError<any>): string[] => {

  if (!Array.isArray(val)) { throw err; }
  if (!R.all((elem) => typeof elem === "string", val)) { throw err; }

  return val;
}


export const isInt = (val: any, err: ClientErrors.ClientError<any>): number => {

  const valAsInt = parseInt(val, 10);

  if (isNaN(valAsInt)) { throw err; }

  return valAsInt;
}
