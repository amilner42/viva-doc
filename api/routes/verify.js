// Module for handling common verification.

const R = require('ramda');
const mongoose = require('mongoose');
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');
const RepoModel = mongoose.model('Repo');

const githubApi = require("../github-api");
const errors = require("./errors");


// EXTERNAL


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


const getPullRequestReviewObject = async (repoId, pullRequestNumber) => {

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    throw { httpCode: 404, ...errors.noPullRequestReview };
  }

  return pullRequestReview.toObject();
}


const getCommitReviewObject = async (repoId, pullRequestNumber, commitId) => {

  const commitReview = await CommitReviewModel.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    throw { httpCode: 404, ...errors.noCommitReview };
  }

  return commitReview.toObject();
}


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

  if (pullRequestReviewObject.pendingAnalysisForCommits[0] === commitId) {
    throw { httpCode: 423, ...errors.commitStillLoading }
  }
}


const ownsTags = (tagsAndOwners, tagIds, username) => {

  const userOwnsTags = R.all((tagId) => {
    return R.any((tagAndOwner) => {
      return (tagAndOwner.owner === username) && (tagAndOwner.tagId === tagId);
    }, tagsAndOwners)
  }, tagIds);

  if (!userOwnsTags) {
    throw { httpCode: 403, ...errors.noModifyingTagsYouDontOwn };
  }
}


const tagApproved = (currentlyApprovedTags, tagId, httpCode, err) => {

  if (!R.contains(tagId, currentlyApprovedTags)) {
    throw { httpCode, ...err };
  }
}


const tagRejected = (currentlyRejectedTags, tagId, httpCode, err) => {

  if (!R.contains(tagId, currentlyRejectedTags)) {
    throw { httpCode, ...err };
  }
}


const tagsNotAlreadyApproved = (currentlyApprovedTags, tags, err) => {

  if (containsAnyTag(currentlyApprovedTags, tags)) {
    throw { httpCode: 403, ...err };
  }
}


const tagsNotAlreadyRejected = (currentlyRejectedTags, tags, err) => {

  if (containsAnyTag(currentlyRejectedTags, tags)) {
    throw { httpCode: 403, ...err };
  }
}


const userHasNotApprovedDocs = (remainingOwnersToApproveDocs, username, err) => {

  if (!R.contains(username, remainingOwnersToApproveDocs)) {
    throw { httpCode: 403, ...err };
  }
}


const updateMatchedOneResult = (updateResult, httpCode, err) => {

  if (updateResult.n !== 1) {
    throw { httpCode, ...err };
  }
}


const updateMatchedBecauseHeadCommitHasNotChanged = async (updateResult, repoId, prNumber, commitId) => {

  if (updateResult.n === 1) {
    return;
  }

  const pullRequestReviewObject = await getPullRequestReviewObject(repoId, prNumber);

  // Most likely no longer the head commit.
  isHeadCommit(pullRequestReviewObject, commitId);

  // Otherwise some internal error?
  throw { httpCode: 500, ...errors.internalServerError };

}


const updateModifiedOneResult = (updateResult) => {

  if (updateResult.ok !== 1 || updateResult.nModified !== 1) {
    throw { httpCode: 500, ...errors.internalServerError };
  }
}


// INTERNAL


const containsAnyTag = (tagList, tagMembers) => {
  return R.any((tagMember) => {
    return R.contains(tagMember, tagList);
  }, tagMembers);
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
  tagApproved,
  tagRejected,
  tagsNotAlreadyApproved,
  tagsNotAlreadyRejected,
  userHasNotApprovedDocs,
  updateMatchedOneResult,
  updateMatchedBecauseHeadCommitHasNotChanged,
  updateModifiedOneResult
}
