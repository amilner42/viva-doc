// Module for handling common verification.

const R = require('ramda');
const mongoose = require('mongoose');
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');
const RepoModel = mongoose.model('Repo');

const githubApi = require("../github-api");
const errors = require("./errors");


// EXTERNAL


// TODO move
const getLoggedInUser = (req) => {
  if (!req.user) {
    throw { httpCode: 401, ...errors.notLoggedInError };
  }

  return req.user;
}


const hasAccessToRepo = async (user, repoId) => {

  const basicUserData = await githubApi.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = githubApi.hasAccessToRepo(basicUserData.repos, repoId);

  if (!hasAccessToRepo) {
    throw { httpCode: 401, ...errors.noAccessToRepoError };
  }
}


// TODO move
const getPullRequestReviewObject = async (repoId, pullRequestNumber) => {

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    throw { httpCode: 404, ...errors.noPullRequestReview };
  }

  return pullRequestReview.toObject();
}


// TODO move
const getCommitReviewObject = async (repoId, pullRequestNumber, commitId) => {

  const commitReview = await CommitReviewModel.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    throw { httpCode: 404, ...errors.noCommitReview };
  }

  return commitReview.toObject();
}


// TODO move
const getRepoObject = async (repoId) => {

  const repo = await RepoModel.findOne({ repoIds: repoId }).exec();

  if (repo === null) {
    throw { httpCode: 404, ...errors.noRepo }
  }

  return repo.toObject();
}


const isHeadCommit = (pullRequestReviewObject, commitId) => {

  if (pullRequestReviewObject.headCommitId !== commitId) {
    throw { httpCode: 423, ...errors.noUpdatingNonHeadCommit(pullRequestReviewObject.headCommitId) };
  }
}


const isLoadedHeadCommit = (pullRequestReviewObject, commitId) => {

  if (pullRequestReviewObject.headCommitId !== commitId) {
    throw { httpCode: 423, ...errors.noUpdatingNonHeadCommit(pullRequestReviewObject.headCommitId) };
  }

  if ( pullRequestReviewObject.pendingAnalysisForCommits[0] &&
       pullRequestReviewObject.pendingAnalysisForCommits[0].head === commitId ) {
    throw { httpCode: 423, ...errors.commitStillLoading }
  }
}


const ownsTags = (tagsOwnerGroups, tagIds, username) => {

  for (let tagId of tagIds) {

    const tagOwnerGroups = R.find(R.propEq("tagId", tagId), tagsOwnerGroups);

    if (tagOwnerGroups === undefined) {
      throw { httpCode: 403, ...errors.noModifyingTagsThatDontExist };
    }

    const userInTagOwnerGroups = R.any(R.contains(username), tagOwnerGroups.groups);

    if (!userInTagOwnerGroups) {
      throw { httpCode: 403, ...errors.noModifyingTagsYouDontOwn };
    }
  }

}


const assessmentsAreForDifferentTags = (tagIds) => {

  if (R.uniq(tagIds).length !== tagIds.length) {
    throw { httpCode: 400, ...errors.userAssmentsMustBeToUniqueTags };
  }
}


const isArrayOfString = (val, err) => {

  const errWithHttpCode = { httpCode: 400,  ...err };

  if (!Array.isArray(val)) { throw errWithHttpCode; }
  if (!R.all((elem) => typeof elem === "string", val)) { throw errWithHttpCode; }

  return val;
}

const isInt = (val, err) => {

  const errWithHttpCode = { httpCode: 400, ...err };
  const valAsInt = parseInt(val, 10);

  if (isNaN(valAsInt)) {
    throw errWithHttpCode;
  }

  return val;
}


module.exports = {
  getLoggedInUser,
  hasAccessToRepo,
  getPullRequestReviewObject,
  getCommitReviewObject,
  getRepoObject,
  isHeadCommit,
  isLoadedHeadCommit,
  ownsTags,
  assessmentsAreForDifferentTags,
  isArrayOfString,
  isInt
}
