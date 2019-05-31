const R = require('ramda');
const router = require('express').Router();
const mongoose = require('mongoose');

const github = require("../../github");
const errorMessages = require("../error-messages");
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');


router.get('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId'
, async function (req, res, next) {

  const user = req.user;

  if (!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const { repoId, pullRequestNumber, commitId } = req.params;
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    return res.staus(404).send({ message: errorMessages.noPullRequestReview });
  }

  const commitReview = await CommitReviewModel.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    return res.status(404).send({ message: errorMessages.noCommitReview });
  }

  const pullRequestReviewObject = pullRequestReview.toObject();
  const commitReviewObject = commitReview.toObject();

  commitReviewObject.isHeadCommit = commitReview.commitId === pullRequestReviewObject.headCommitId;

  return res.json(commitReviewObject);
});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, pullRequestNumber, commitId } = req.params;
  const tagsToApprove = req.body.approveTags; // TODO Validate this?

  if (!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  const pullRequestReview = await PullRequestReviewModel.findOne({ repoId, pullRequestNumber }).exec();

  if (pullRequestReview === null) {
    return res.staus(404).send({ message: errorMessages.noPullRequestReview });
  }

  const commitReview = await CommitReview.findOne({ repoId, pullRequestNumber, commitId }).exec();

  if (commitReview === null) {
    return res.status(404).send({ message: errorMessages.noCommitReview });
  }

  const commitReviewObject = commitReview.toObject();
  const pullRequestReviewObject = pullRequestReview.toObject();

  if (pullRequestReviewObject.headCommitId !== commitId) {
    return res.status(423).send({ message: errorMessages.noUpdatingNonHeadCommit });
  }

  if (!ownsTags(commitReviewObject.tagsAndOwners, tagsToApprove, username)) {
    return res.status(403).send({ message: errorMessages.noAccessToApproveTagsError })
  }

  if (containsAnyTag(commitReviewObject.approveTags, tagsToApprove)) {
    return res.status(403).send({ message: errorMessages.noApprovingAlreadyApprovedTag })
  }

  if (containsAnyTag(commitReviewObject.rejectedTags, tagsToApprove)) {
    return res.status(403).send({ message: errorMessages.noApprovingRejectedTag });
  }

  if (!hasToApproveDocs(commitReviewObject.remainingOwnersToApproveDocs, username)) {
    return res.status(403).send({ message: errorMessages.noModifyingTagsAfterConfirmation })
  }

  // TODO RACE CONDITIONS ON QUERY

  const pullRequestUpdateResult = await PullRequestReviewModel.updateOne(
    {
      repoId,
      pullRequestNumber,
      headCommitId: commitId
    },
    {
      $addToSet: { "headCommitApprovedTags": { $each: tagsToApprove } }
    }
  ).exec();

  if (!updateOneMatched(pullRequestUpdateResult)) {
    return res.status(423).send({ message: errorMessages.noUpdatingNonHeadCommit });
  }

  if (!updateOneModified(pullRequestUpdateResult)) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  const commitReviewUpdateResult = await CommitReviewModel.updateOne(
    {
      repoId,
      pullRequestNumber,
      commitId
    },
    {
      $addToSet: { "approvedTags": { $each: tagsToApprove } }
    }
  ).exec();

  if (!updateOneMatched(commitReviewUpdateResult) || !updateOneModified(commitReviewUpdateResult)) {
    // TODO What to do here? We've already done updates to PR
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});
});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags/:tagId'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, pullRequestNumber, commitId, tagId } = req.params;

  if (!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO ALL SAFETY CHECKS / RACE CONDITIONS ON QUERIES

  const pullRequestUpdateResult = await PullRequestReviewModel.updateOne(
    {
      repoId,
      pullRequestNumber,
      headCommitId: commitId
    },
    {
      $pull: { "headCommitApprovedTags": tagId }
    }
  ).exec();

  if (!updateOneMatched(pullRequestUpdateResult)) {
    return res.status(423).send({ message: errorMessages.noUpdatingNonHeadCommit });
  }

  if (!updateOneModified(pullRequestUpdateResult)) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  const commitReviewUpdateResult = await commitReviewUpdateResult.updateOne(
    {
      repoId,
      pullRequestNumber,
      commitId
    },
    {
      $pull: { "approvedTags": tagId }
    }
  ).exec();

  if (!updateOneMatched(commitReviewUpdateResult) || !updateOneModified(commitReviewUpdateResult)) {
    // TODO What to do here? We've already done updates to PR
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});
});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, pullRequestNumber, commitId } = req.params;
  const tagsToReject = req.body.rejectTags; // TODO Validate this?

  if (!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO ALL SAFETY CHECKS / RACE CONDITIONS ON QUERIES

  const pullRequestUpdateResult = await PullRequestReviewModel.updateOne(
    {
      repoId,
      pullRequestNumber,
      headCommitId: commitId
    },
    {
      $addToSet: { "headCommitRejectedTags": { $each: tagsToReject } }
    }
  ).exec();

  if (!updateOneMatched(pullRequestUpdateResult)) {
    return res.status(423).send({ message: errorMessages.noUpdatingNonHeadCommit });
  }

  if (!updateOneModified(pullRequestUpdateResult)) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  const commitReviewUpdateResult = await commitReviewUpdateResult.updateOne(
    {
      repoId,
      pullRequestNumber,
      commitId
    },
    {
      $addToSet: { "rejectedTags": { $each: tagsToReject } }
    }
  ).exec();

  if (!updateOneMatched(commitReviewUpdateResult) || !updateOneModified(commitReviewUpdateResult)) {
    // TODO What to do here? We've already done updates to PR
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});
});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags/:tagId'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, pullRequestNumber, commitId, tagId } = req.params;

  if (!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO ALL SAFETY CHECKS / RACE CONDITIONS ON QUERIES

  const pullRequestUpdateResult = await PullRequestReviewModel.updateOne(
    {
      repoId,
      pullRequestNumber,
      headCommitId: commitId
    },
    {
      $pull: { "headCommitRejectedTags": tagId }
    }
  ).exec();

  if (!updateOneMatched(pullRequestUpdateResult)) {
    return res.status(423).send({ message: errorMessages.noUpdatingNonHeadCommit });
  }

  if (!updateOneModified(pullRequestUpdateResult)) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  const commitReviewUpdateResult = await commitReviewUpdateResult.updateOne(
    {
      repoId,
      pullRequestNumber,
      commitId
    },
    {
      $pull: { "rejectedTags": tagId }
    }
  ).exec();

  if (!updateOneMatched(commitReviewUpdateResult) || !updateOneModified(commitReviewUpdateResult)) {
    // TODO What to do here? We've already done updates to PR
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});

});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approveddocs'
, async function (req, res, next) {

  // TODO
  res.status(500).send({ message: "NOT IMPLEMENTED "})

});


const hasToApproveDocs = (remainingOwnersToApproveDocs, username) => {
  return R.contains(username, remainingOwnersToApproveDocs);
}


const ownsTags = (tagsAndOwners, tagIds, username) => {
  return R.all((tagId) => {
    return R.any((tagAndOwner) => {
      return tagAndOwner.owner === username && tagAndOwner.tagId === tagId;
    }, tagsAndOwners)
  }, tagIds);
}


const containsAnyTag = (tagList, tagMembers) => {
  return R.any((tagMember) => {
    return R.contains(tagMember, tagList);
  }, tagMembers);
}


const updateOneMatched = (updateResult) => {
  return updateResult.n === 1;
}


const updateOneModified = (updateResult) => {
  return updateResult.nModified === 1;
}


module.exports = router;
