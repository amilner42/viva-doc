const R = require('ramda');
const router = require('express').Router();
const mongoose = require('mongoose');

const github = require("../../github");
const errorMessages = require("../error-messages");
const BranchReview = mongoose.model('BranchReview');
const BranchReviewMetadata = mongoose.model('BranchReviewMetadata');


router.get('/review/repo/:repoId/branch/:branchName/commit/:commitId'
, async function(req, res, next) {

  const user = req.user;

  if(!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const { repoId, branchName, commitId } = req.params;
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

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
  branchReview.requiredConfirmations = branchReviewMetadata.requiredConfirmations;

  return res.json(branchReview);
});

router.post('/review/repo/:repoId/branch/:branchName/commit/:commitId/tags/approve'
, async function(req, res, next) {

  const user = req.user;
  const { repoId, branchName, commitId } = req.params;
  const tagsToApprove = req.body.approveTags; // TODO Validate this?

  if(!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO handle not finding it
  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();

  if (!R.all((tagId) => github.isOwnerOfTag(branchReview, tagId, username), tagsToApprove)) {
    return res.status(401).send({ message: errorMessages.noAccessToApproveTagsError });
  }

  const updateResult = await BranchReviewMetadata.update(
    { repoId, branchName, commitId, requiredConfirmations: { $elemMatch: { $eq: username } } },
    { $addToSet: { "approvedTags": { $each: tagsToApprove } } }
  );

  if (updateResult.n === 0) {
    return res.status(403).send({ message: errorMessages.noModifyingTagsAfterConfirmation });
  }

  if (updateResult.ok !== 1) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});
});

router.post('/review/repo/:repoId/branch/:branchName/commit/:commitId/tags/reject'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, branchName, commitId } = req.params;
  const tagsToReject = req.body.rejectTags; // TODO Validate this?

  if(!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO handle not finding it
  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();

  if (!R.all((tagId) => github.isOwnerOfTag(branchReview, tagId, username), tagsToReject)) {
    return res.status(401).send({ message: errorMessages.noAccessToRejectTagsError });
  }

  const updateResult = await BranchReviewMetadata.update(
    { repoId, branchName, commitId, requiredConfirmations: { $elemMatch: { $eq: username } } },
    { $pull: { "approvedTags": { $in: tagsToReject }}}
  )

  if (updateResult.n === 0) {
    return res.status(403).send({ message: errorMessages.noModifyingTagsAfterConfirmation });
  }

  if (updateResult.ok !== 1) {
    return res.status(500).send({ message: errorMessages.internalServerError });
  }

  return res.json({});
});

router.post('/review/repo/:repoId/branch/:branchName/commit/:commitId/docs/approve'
, async function (req, res, next) {

  const user = req.user;
  const { repoId, branchName, commitId } = req.params;

  if(!user) { return res.status(401).send({ message: errorMessages.notLoggedInError }); }

  const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
  const hasAccessToRepo = github.hasAccessToRepo(basicUserData.repos, repoId)

  if (!hasAccessToRepo) { return res.status(401).send({ message: errorMessages.noAccessToRepoError }); }

  const username = user.username;

  // TODO handle not finding branchReview / branchReviewMetadata (could be already confirmed if metadata not found)
  const branchReview = (await BranchReview.findOne({ repoId, branchName, commitId })).toObject();
  const branchReviewMetadata = (await BranchReviewMetadata.findOne({
    repoId,
    branchName,
    commitId,
    requiredConfirmations: { $elemMatch: { $eq: username } }
  })).toObject();

  const allUsersTagsApproved = R.all((fileReview) => {
    const tags = getTags(fileReview);

    return R.all((tag) => {
      const isOwner = tag.owner === username;
      const tagApproved = R.any((approvedTag) => {
        return tag.tagId.equals(approvedTag);
      }, branchReviewMetadata.approvedTags)

      return !isOwner || tagApproved;
    }, tags);

  }, branchReview.fileReviews);

  if (!allUsersTagsApproved) {
    return res.status(403).send({ message: errorMessages.noApprovingDocsBeforeAllTagsApproved });
  }

  const updateResult = await BranchReviewMetadata.update(
    { repoId, branchName, commitId, requiredConfirmations: { $elemMatch: { $eq: username } } },
    { $pull: { "requiredConfirmations": username }}
  )

  // TODO check update result to verify ok

  return res.json({});
});

const getTags = (fileReview) => {

  switch (fileReview.fileReviewType) {

    case "deleted-file":
    case "new-file":
      return fileReview.tags;

    case "modified-file":
    case "renamed-file":
      return R.map((review) => { return review.tag }, fileReview.reviews)

  }
}


module.exports = router;
