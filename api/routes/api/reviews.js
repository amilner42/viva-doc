const R = require("ramda")

const router = require('express').Router();

const verify = require("../verify");
const errors = require("../errors");
const githubApp = require("../../github-app");

const mongoose = require('mongoose');
const PullRequestReviewModel = mongoose.model('PullRequestReview');


const SUCCESS_EMPTY = { success: 1 };


router.get('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    if (R.contains(commitId, pullRequestReviewObject.pendingAnalysisForCommits)) {
      return res.json({ responseTag: "pending", data: pullRequestReviewObject.pendingAnalysisForCommits });
    }

    const err = R.find(R.propEq("commitId", commitId), pullRequestReviewObject.commitReviewErrors);
    if (err !== undefined) {
      return res.json({ responseTag: "analysis-failed", data: err.clientExplanation });
    }

    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);
    commitReviewObject.headCommitId = pullRequestReviewObject.headCommitId;

    if (pullRequestReviewObject.headCommitId === commitId) {
      commitReviewObject.approvedTags = pullRequestReviewObject.headCommitApprovedTags;
      commitReviewObject.rejectTags = pullRequestReviewObject.headCommitRejectedTags;
      commitReviewObject.remainingOwnersToApproveDocs = pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs;
    }

    return res.json({ responseTag: "complete", data: commitReviewObject });

  } catch (err) {
    next(err);
  }
});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);
    const tagsToApprove = req.body.approveTags;

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    const username = user.username;

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(pullRequestReviewObject.headCommitTagsAndOwners, tagsToApprove, username);

    verify.tagsNotAlreadyApproved(
      pullRequestReviewObject.headCommitApprovedTags,
      tagsToApprove,
      errors.noApprovingAlreadyApprovedTag
    );

    verify.tagsNotAlreadyRejected(
      pullRequestReviewObject.headCommitRejectedTags,
      tagsToApprove,
      errors.noApprovingRejectedTag
    );

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errors.noModifyingTagsAfterConfirmation
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

    await verify.updateMatchedBecauseHeadCommitHasNotChanged(pullRequestUpdateResult, repoId, pullRequestNumber, commitId);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json(SUCCESS_EMPTY);

  } catch (err) {
    next(err);
  }

});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approvedtags/:tagId'
, async function (req, res, next) {

  try {
    const { pullRequestNumber, commitId, tagId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(pullRequestReviewObject.headCommitTagsAndOwners, [ tagId ], username);

    verify.tagApproved(
      pullRequestReviewObject.headCommitApprovedTags,
      tagId,
      403,
      errors.noRemovingApprovalOnUnapprovedTag
    );

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errors.noModifyingTagsAfterConfirmation
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

    await verify.updateMatchedBecauseHeadCommitHasNotChanged(pullRequestUpdateResult, repoId, pullRequestNumber, commitId);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json(SUCCESS_EMPTY);

  } catch (err) {
    next(err);
  }

});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);
    const tagsToReject = req.body.rejectTags; // TODO Validate this?

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(pullRequestReviewObject.headCommitTagsAndOwners, tagsToReject, username);

    verify.tagsNotAlreadyApproved(
      pullRequestReviewObject.headCommitApprovedTags,
      tagsToReject,
      errors.noRejectingApprovedTag
    );

    verify.tagsNotAlreadyRejected(
      pullRequestReviewObject.headCommitRejectedTags,
      tagsToReject,
      errors.noRejectingAlreadyRejectedTag
    );

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errors.noModifyingTagsAfterConfirmation
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

    await verify.updateMatchedBecauseHeadCommitHasNotChanged(pullRequestUpdateResult, repoId, pullRequestNumber, commitId);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json(SUCCESS_EMPTY);

  } catch (err) {
    next(err);
  }

});


router.delete('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/rejectedtags/:tagId'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId, tagId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);

    verify.ownsTags(pullRequestReviewObject.headCommitTagsAndOwners, [ tagId ], username);

    verify.tagRejected(
      pullRequestReviewObject.headCommitRejectedTags,
      tagId,
      403,
      errors.noRemovingRejectionOnUnrejectedTag
    );

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errors.noModifyingTagsAfterConfirmation
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

    await verify.updateMatchedBecauseHeadCommitHasNotChanged(pullRequestUpdateResult, repoId, pullRequestNumber, commitId);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json(SUCCESS_EMPTY);

  } catch (err) {
    next(err);
  }

});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/approveddocs'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = parseInt(req.params.repoId, 10);

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const username = user.username;

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    const repoName = pullRequestReviewObject.repoName;

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);

    verify.userHasNotApprovedDocs(
      pullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
      username,
      errors.noApprovingDocsIfNotOnRemainingDocApprovalList
    );

    const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber, headCommitId: commitId },
      { $pull: { "headCommitRemainingOwnersToApproveDocs": username } },
      { new: true }
    ).exec();

    if (updatedPullRequestReview === null) {
      const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

      // Either not head commit or some internal error.
      verify.isHeadCommit(pullRequestReviewObject, commitId);
      throw { httpCode: 500, ...errors.internalServerError };
    }

    // No need for any more work, still people that need to approve their docs.
    if (updatedPullRequestReview.headCommitRemainingOwnersToApproveDocs.length > 0) {
      return res.json(SUCCESS_EMPTY);
    }

    // Otherwise everyone has approved the docs, we must set the commit status.

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

    verify.updateMatchedOneResult(pullRequestUpdateResult, 500, errors.internalServerError);
    verify.updateModifiedOneResult(pullRequestUpdateResult);

    return res.json(SUCCESS_EMPTY);

  } catch (err) {
    next(err);
  }

});


module.exports = router;
