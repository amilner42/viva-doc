const R = require('ramda');
const router = require('express').Router();
const mongoose = require('mongoose');

const github = require("../../github");
const BranchReview = mongoose.model('BranchReview');
const BranchReviewMetadata = mongoose.model('BranchReviewMetadata');


router.get('/review/repo/:repoId/branch/:branchName/commit/:commitId'
, async function(req, res, next) {

  const user = req.user;

  // TODO
  if(!user) { return res.json({}); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const { repoId, branchName, commitId } = req.params;
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  // TODO
  if (!hasAccessToRepo) {
    return res.json({});
  }

  // TODO handle not finding it
  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();
  const branchReviewMetadata = (await BranchReviewMetadata.findOne({ repoId, branchName, commitId })).toObject();

  // TODO
  if (branchReview === null) {
    return res.json({});
  }

  // Add username/repos to the obj
  branchReview.username = basicUserData.username
  branchReview.repos = basicUserData.repos
  branchReview.approvedTags = branchReviewMetadata.approvedTags;

  return res.json(branchReview);
});

router.post('/review/repo/:repoId/branch/:branchName/commit/:commitId/tags'
, async function(req, res, next) {

  const user = req.user;
  const { repoId, branchName, commitId } = req.params;
  const tagsToApprove = req.body.approveTags; // TODO Validate this?

  // TODO Check access to repo? or becuase we verify tag ownership it doesn't matter?

  // TODO handle unauth
  if(!user) { return res.json({}); }

  const username = user.username;

  // TODO handle not finding it
  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();

  // TODO handle not being owner of all tags being updated
  if (!R.all((tagId) => github.isOwnerOfTag(branchReview, tagId, username), tagsToApprove)) {
    return res.json({});
  }

  // TODO handle errors
  await BranchReviewMetadata.update(
    { repoId, branchName, commitId },
    { $addToSet: { "approvedTags": { $each: tagsToApprove } } }
  );

  return res.json({});
});

module.exports = router;
