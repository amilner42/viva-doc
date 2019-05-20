const router = require('express').Router();
const github = require("../../github");
const mongoose = require('mongoose');
const BranchReview = mongoose.model('BranchReview');
const BranchReviewMetadata = mongoose.model('BranchReviewMetadata');


router.get('/review/repo/:repoId/branch/:branchName/commit/:commitId'
, async function(req, res, next) {

  const user = req.user;

  // TODO
  if(!user) {
      return res.json({});
  }

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

module.exports = router;
