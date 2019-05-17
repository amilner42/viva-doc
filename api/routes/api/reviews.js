const router = require('express').Router();
const github = require("../../github");
const mongoose = require('mongoose');
const BranchReview = mongoose.model('BranchReview');

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

  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();

  // TODO
  if (branchReview === null) {
    return res.json({});
  }

  // Add username/repos to the obj
  branchReview.username = basicUserData.username
  branchReview.repos = basicUserData.repos

  return res.json(branchReview);
});

module.exports = router;
