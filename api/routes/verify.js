// Module for handling common verification.

const R = require('ramda');
const mongoose = require('mongoose');
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');

const githubApi = require("../github-api");
const errorMessages = require("./error-messages");


// EXTERNAL


const getLoggedInUser = (req) => {
  if (!req.user) {
    throw { httpCode: 401, message: errorMessages.notLoggedInError };
  }

  return req.user;
}


const hasAccessToRepo = async (user, repoId) => {

  const basicUserData = await githubApi.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = githubApi.hasAccessToRepo(basicUserData.repos, repoId);

  if (!hasAccessToRepo) {
    throw { httpCode: 401, message: errorMessages.noAccessToRepoError };
  }
}


const getPullRequestReviewObject = async (repoId, pullRequestNumber) => {

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    throw { httpCode: 404, message: errorMessages.noPullRequestReview };
  }

  return pullRequestReview.toObject();
}


const getCommitReviewObject = async (repoId, pullRequestNumber, commitId) => {

  const commitReview = await CommitReviewModel.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    throw { httpCode: 404, message: errorMessages.noCommitReview };
  }

  return commitReview.toObject();
}


const isHeadCommit = (pullRequestReviewObject, commitReviewObject) => {

  if (pullRequestReviewObject.headCommitId !== commitReviewObject.commitId) {
    throw { httpCode: 423, message: errorMessages.noUpdatingNonHeadCommit };
  }
}


const ownsTags = (tagsAndOwners, tagIds, username) => {

  const userOwnsTags = R.all((tagId) => {
    return R.any((tagAndOwner) => {
      return (tagAndOwner.owner === username) && (tagAndOwner.tagId === tagId);
    }, tagsAndOwners)
  }, tagIds);

  if (!userOwnsTags) {
    throw { httpCode: 403, message: errorMessages.noModifyingTagsYouDontOwn };
  }
}


const tagApproved = (currentlyApprovedTags, tagId, httpCode, errMessage) => {

  if (!R.contains(tagId, currentlyApprovedTags)) {
    throw { httpCode, message: errMessage };
  }
}

const tagRejected = (currentlyRejectedTags, tagId, httpCode, errMessage) => {

  if (!R.contains(tagId, currentlyRejectedTags)) {
    throw { httpCode, message: errMessage };
  }
}


const tagsNotAlreadyApproved = (currentlyApprovedTags, tags, errMessage) => {

  if (containsAnyTag(currentlyApprovedTags, tags)) {
    throw { httpCode: 403, message: errMessage };
  }
}


const tagsNotAlreadyRejected = (currentlyRejectedTags, tags, errMessage) => {

  if (containsAnyTag(currentlyRejectedTags, tags)) {
    throw { httpCode: 403, message: errMessage };
  }
}


const userHasNotApprovedDocs = (remainingOwnersToApproveDocs, username, errMessage) => {

  if (!R.contains(username, remainingOwnersToApproveDocs)) {
    throw { httpCode: 403, message: errMessage };
  }
}


const updateMatchedOneResult = (updateResult, httpCode, errMessage) => {

  if (updateResult.n !== 1) {
    throw { httpCode, message: errMessage };
  }
}


const updateModifiedOneResult = (updateResult) => {

  if (updateResult.ok !== 1 || updateResult.nModified !== 1) {
    throw { httpCode: 500, message: errorMessages.internalServerError };
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
  isHeadCommit,
  ownsTags,
  tagApproved,
  tagRejected,
  tagsNotAlreadyApproved,
  tagsNotAlreadyRejected,
  userHasNotApprovedDocs,
  updateMatchedOneResult,
  updateModifiedOneResult
}
