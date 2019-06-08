const R = require("ramda")

const router = require('express').Router();

const verify = require("../verify");
const errorMessages = require("../error-messages");
const githubApp = require("../../github-app");

const mongoose = require('mongoose');
const CommitReviewModel = mongoose.model('CommitReview');
const PullRequestReviewModel = mongoose.model('PullRequestReview');

// TODO endpoints here need to be midnful of race conditions / mid way updates. Should probably all only update PullRequest...

router.get('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId'
, async function (req, res, next) {

  try {

    const { repoId, pullRequestNumber, commitId } = req.params;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);
    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    commitReviewObject.headCommitId = pullRequestReviewObject.headCommitId;
    return res.json(commitReviewObject);

  } catch (err) {
    next(err);
  }
});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags'
, async function (req, res, next) {

  try {

    const { repoId, pullRequestNumber, commitId } = req.params;
    const tagsToApprove = req.body.approveTags;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);
    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    const username = user.username;

    verify.isHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(commitReviewObject.tagsAndOwners, tagsToApprove, username);

    verify.tagsNotAlreadyApproved(
      commitReviewObject.approvedTags,
      tagsToApprove,
      errorMessages.noApprovingAlreadyApprovedTag
    );

    verify.tagsNotAlreadyRejected(
      commitReviewObject.rejectedTags,
      tagsToApprove,
      errorMessages.noApprovingRejectedTag
    );

    verify.userHasNotApprovedDocs(
      commitReviewObject.remainingOwnersToApproveDocs,
      username,
      errorMessages.noModifyingTagsAfterConfirmation
    );

    const pullRequestUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId
      },
      {
        $addToSet: { "headCommitApprovedTags": { $each: tagsToApprove } }
      }
    ).exec();

    verify.updateMatchedOneResult(pullRequestUpdateResult, 423, errorMessages.noUpdatingNonHeadCommit);
    verify.updateModifiedOneResult(pullRequestUpdateResult);


    const commitReviewUpdateResult = await CommitReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        commitId
      },
      {
        $addToSet: { "approvedTags": { $each: tagsToApprove } }
      }
    ).exec();

    verify.updateMatchedOneResult(commitReviewUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(commitReviewUpdateResult);

    return res.json({});

  } catch (err) {
    next(err);
  }

});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags/:tagId'
, async function (req, res, next) {

  try {
    const { repoId, pullRequestNumber, commitId, tagId } = req.params;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);
    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    verify.isHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(commitReviewObject.tagsAndOwners, [ tagId ], username);

    verify.tagApproved(commitReviewObject.approvedTags, tagId, 403, errorMessages.noRemovingApprovalOnUnapprovedTag);

    verify.userHasNotApprovedDocs(
      commitReviewObject.remainingOwnersToApproveDocs,
      username,
      errorMessages.noModifyingTagsAfterConfirmation
    );

    const pullRequestUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId
      },
      {
        $pull: { "headCommitApprovedTags": tagId }
      }
    ).exec();

    verify.updateMatchedOneResult(pullRequestUpdateResult, 423, errorMessages.noUpdatingNonHeadCommit);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    const commitReviewUpdateResult = await CommitReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        commitId
      },
      {
        $pull: { "approvedTags": tagId }
      }
    ).exec();

    verify.updateMatchedOneResult(commitReviewUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(commitReviewUpdateResult);

    return res.json({});

  } catch (err) {
    next(err);
  }

});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags'
, async function (req, res, next) {

  try {

    const { repoId, pullRequestNumber, commitId } = req.params;
    const tagsToReject = req.body.rejectTags; // TODO Validate this?

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);
    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    verify.isHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(commitReviewObject.tagsAndOwners, tagsToReject, username);

    verify.tagsNotAlreadyApproved(
      commitReviewObject.approvedTags,
      tagsToReject,
      errorMessages.noRejectingApprovedTag
    );

    verify.tagsNotAlreadyRejected(
      commitReviewObject.rejectedTags,
      tagsToReject,
      errorMessages.noRejectingAlreadyRejectedTag
    );

    verify.userHasNotApprovedDocs(
      commitReviewObject.remainingOwnersToApproveDocs,
      username,
      errorMessages.noModifyingTagsAfterConfirmation
    );

    const pullRequestUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId
      },
      {
        $addToSet: { "headCommitRejectedTags": { $each: tagsToReject } }
      }
    ).exec();

    verify.updateMatchedOneResult(pullRequestUpdateResult, 423, errorMessages.noUpdatingNonHeadCommit);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    const commitReviewUpdateResult = await CommitReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        commitId
      },
      {
        $addToSet: { "rejectedTags": { $each: tagsToReject } }
      }
    ).exec();

    verify.updateMatchedOneResult(commitReviewUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(commitReviewUpdateResult);

    return res.json({});

  } catch (err) {
    next(err);
  }

});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags/:tagId'
, async function (req, res, next) {

  try {

    const { repoId, pullRequestNumber, commitId, tagId } = req.params;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);
    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    verify.isHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(commitReviewObject.tagsAndOwners, [ tagId ], username);

    verify.tagRejected(commitReviewObject.rejectedTags, tagId, 403, errorMessages.noRemovingRejectionOnUnrejectedTag);

    verify.userHasNotApprovedDocs(
      commitReviewObject.remainingOwnersToApproveDocs,
      username,
      errorMessages.noModifyingTagsAfterConfirmation
    );

    const pullRequestUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId
      },
      {
        $pull: { "headCommitRejectedTags": tagId }
      }
    ).exec();

    verify.updateMatchedOneResult(pullRequestUpdateResult, 423, errorMessages.noUpdatingNonHeadCommit);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    const commitReviewUpdateResult = await CommitReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        commitId
      },
      {
        $pull: { "rejectedTags": tagId }
      }
    ).exec();

    verify.updateMatchedOneResult(commitReviewUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(commitReviewUpdateResult);

    return res.json({});

  } catch (err) {
    next(err);
  }

});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approveddocs'
, async function (req, res, next) {

  try {

    const { repoId, pullRequestNumber, commitId } = req.params;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    const repoName = R.last(pullRequestReviewObject.repoFullName.split("/"))

    verify.isHeadCommit(pullRequestReviewObject, commitId);

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errorMessages.noApprovingDocsIfNotOnRemainingDocApprovalList
    );

    const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber, headCommitId: commitId },
      { $pull: { "headCommitRemainingOwnersToApproveDocs": username } },
      { new: true }
    ).exec();

    if (updatedPullRequestReview === null) {
      throw { httpCode: 423, message: errorMessages.noUpdatingNonHeadCommit };
    }

    const commitReviewUpdateResult = await CommitReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        commitId
      },
      {
        $pull: { "remainingOwnersToApproveDocs": username }
      }
    ).exec();

    verify.updateMatchedOneResult(commitReviewUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(commitReviewUpdateResult);

    // No need for any more work, still people that need to approve their docs.
    if (updatedPullRequestReview.headCommitRemainingOwnersToApproveDocs.length > 0) {
      return res.json({});
    }

    const repoObject = await verify.getRepoObject(repoId);

    // TODO Should we wrap this in a try catch and handle errors better? Not sure how...
    await githubApp.putSuccessStatusOnCommit(
      repoObject.installationId,
      repoObject.owner,
      repoName,
      commitId
    );

    const pullRequestUpdateResult = await PullRequestReviewModel.update(
      { repoId, pullRequestNumber },
      {
        "currentAnalysisLastCommitWithSuccessStatus": commitId,
        "currentAnalysisLastAnalyzedCommit": commitId
      }
    ).exec();

    verify.updateMatchedOneResult(pullRequestUpdateResult, 500, errorMessages.internalServerError);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json({});

  } catch (err) {
    next(err);
  }

});


module.exports = router;
