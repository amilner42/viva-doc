const R = require("ramda")

const router = require('express').Router();

const verify = require("../verify");
const errors = require("../errors");
const githubApp = require("../../github-app");
const mongoHelpers = require("../../mongo-helpers");

const mongoose = require('mongoose');
const PullRequestReviewModel = mongoose.model('PullRequestReview');
const RepoModel = mongoose.model('Repo');


router.get('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = verify.isInt(req.params.repoId, errors.invalidUrlParams("Repo ID must be a number."));

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    const pendingHeadCommitIds = R.map(R.prop("head"), pullRequestReviewObject.pendingAnalysisForCommits);

    if (R.contains(commitId, pendingHeadCommitIds)) {
      return res.json(
        {
          responseTag: "pending",
          headCommitId: pullRequestReviewObject.headCommitId,
          forCommits: pendingHeadCommitIds
        }
      );
    }

    const err = R.find(R.propEq("commitId", commitId), pullRequestReviewObject.commitReviewErrors);
    if (err !== undefined) {
      return res.json(
        {
          responseTag: "analysis-failed",
          headCommitId: pullRequestReviewObject.headCommitId,
          clientExplanation: err.clientExplanation
        }
      );
    }

    const commitReviewObject = await verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    if (pullRequestReviewObject.headCommitId === commitId) {
      commitReviewObject.approvedTags = pullRequestReviewObject.headCommitApprovedTags;
      commitReviewObject.rejectTags = pullRequestReviewObject.headCommitRejectedTags;
      commitReviewObject.userAssessments = pullRequestReviewObject.headCommitUserAssessments;
    }

    return res.json({
      responseTag: "complete",
      headCommitId: pullRequestReviewObject.headCommitId,
      commitReview: commitReviewObject
    });

  } catch (err) {
    next(err);
  }
});


router.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/userassessments'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = verify.isInt(req.params.repoId, errors.invalidUrlParams("Repo ID must be a number."));
    const tagIdsToApprove = verify.isArrayOfString(
      req.body.approveTags, errors.invalidRequestBodyType(`Field 'approveTags' must contain an array of string.`)
    );
    const tagIdsToReject = verify.isArrayOfString(
      req.body.rejectTags, errors.invalidRequestBodyType(`Field 'rejectTags' must contain an array of string.`)
    );
    const allTagIds = [ ...tagIdsToReject, ...tagIdsToApprove ];

    const newUserApprovalAssessments = createAssessments("approved", username, tagIdsToApprove);
    const newUserRejectionAssessments = createAssessments("rejected", username, tagIdsToReject);
    const newUserAssessments = [ ...newUserApprovalAssessments, ...newUserRejectionAssessments ];

    const user = verify.getLoggedInUser(req);
    await verify.hasAccessToRepo(user, repoId);

    const pullRequestReviewObject = await verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    const username = user.username;

    verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);
    verify.ownsTags(pullRequestReviewObject.headCommitTagsOwnerGroups, allTagIds, username);
    verify.assessmentsAreForDifferentTags(allTagIds);

    const addUserAssessmentsResults = await addUserAssessments(
      repoId,
      pullRequestNumber,
      commitId,
      newUserAssessments,
      pullRequestReviewObject.headCommitTagsOwnerGroups
    );

    if ( allTagsApproved(
          pullRequestReviewObject.tagsOwnerGroups.length,
          pullRequestReviewObject.approvedTags.length,
          addUserAssessmentsResults
         )
    ) {

      // TODO wrap in try-catch and handle error
      const repoObject = await verify.getRepoObject(repoId);
      await githubApp.putSuccessStatusOnCommit(
        repoObject.installationId,
        repoObject.owner,
        repoName,
        repoId,
        pullRequestNumber,
        commitId
      );

    }

    return res.json(addUserAssessmentsResults);

  } catch (err) {
    next(err);
  }

});


module.exports = router;


// INTERNAL


// TODO Move
const createAssessments = (assessmentType, username, tagIds) => {
  return tagIds.map(createAssessment(assessmentType, username));
}


// TODO Move
const createAssessment = R.curry((assessmentType, username, tagId) => {
  return { tagId, assessmentType, username };
});


// TODO Move
// TODO DOC
const allTagsApproved = (totalTags, initialApprovedTags, addUserAssessmentsResults) => {

  const numberOfNewApprovedTags = R.filter((addUserAssessmentResult) => {
    return addUserAssessmentResult.status === "approval-success" && addUserAssessmentResult.tagApproved;
  }, addUserAssessmentsResults).length;

  return (initialApprovedTags + numberOfNewApprovedTags) === totalTags;
}


// TODO Move
// TODO DOC
const addRejectionUserAssessment = async (repoId, pullRequestNumber, commitId, userAssessment) => {
  try {

    const tagId = userAssessment.tagId;

    const addRejectionUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId,
        headCommitApprovedTags: { $nin: [ tagId ] },
        headCommitRejectedTags: { $nin: [ tagId ] },
        headCommitUserAssessments: { $nin: [ userAssessment ] }
      },
      {
        $push: {
          "headCommitUserAssessments": userAssessment,
          "headCommitRejectedTags": tagId
        },
      }
    ).exec();

    // TODO log error if needed.
    // TODO make these errors better (priority: for the head commit updating / tag already being approved/rejected)
    if ( !mongoHelpers.updateOk(addRejectionUpdateResult)
          || !mongoHelpers.updateMatchedOneResult(addRejectionUpdateResult)
          || !mongoHelpers.updateModifiedOneResult(addRejectionUpdateResult)
    ) {
      return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } }
    }

    return { tagId, status: "rejection-success" };

  } catch (updateErr) {

    // TODO log error
    return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } }
  }
}


// TODO Move
// TODO DOC
const addApprovalUserAssessment = async (repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups) => {

  const { username, tagId } = userAssessment;
  const tagOwnerGroups = R.find(R.propEq("tagId", tagId), tagsOwnerGroups);

  const userApprovalGuaranteesTagApproval = R.all((owners) => {
    return R.contains(username, owners);
  }, tagOwnerGroups.groups);

  if (userApprovalGuaranteesTagApproval) {
    try {

      const addApprovalUpdateResult = await PullRequestReviewModel.update(
        {
          repoId,
          pullRequestNumber,
          headCommitId: commitId,
          headCommitApprovedTags: { $nin: [ tagId ] },
          headCommitRejectedTags: { $nin: [ tagId ] },
          headCommitUserAssessments: { $nin: [ userAssessment ] }
        },
        {
          $push: {
            "headCommitUserAssessments": userAssessment,
            "headCommitApprovedTags": tagId
          }
        }
      ).exec();


      // TODO log error if needed.
      // TODO make these errors better (priority: for the head commit updating / tag already being approved/rejected)
      if ( !mongoHelpers.updateOk(addApprovalUpdateResult)
            || !mongoHelpers.updateMatchedOneResult(addApprovalUpdateResult)
            || !mongoHelpers.updateModifiedOneResult(addApprovalUpdateResult)
      ) {
        return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } }
      }

      return { tagId, status: "approval-success", tagApproved: true };

    } catch (err) {

      // TODO log error
      return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } }
    }
  }

  // In the following case, the user approval may or may not cause the tag to be approved. To do this atomically, we do
  // two atomic updates below, first doing an update with query settings assuming that the approval will not cause the
  // tag to be approved, and then if that fails, we try again this time with query settings assuming this update will
  // cause the tag to be approved. If both fail we pass along the error.

  const groupsWithoutUser = R.filter((owners) => {
    return !R.contains(username, owners);
  }, tagOwnerGroups.groups);


  // First try an atomic update assuming that this assessment will NOT cause the tag to be approved.
  try {

    const mongoQueryAtLeastOneGroupOutsideUserLacksApproval = {
      $or: groupsWithoutUser.map((owners) => {
        return {
          $nin: owners.map((owner) => {
            return createAssessment("approved", owner, tagId);
          })
        }
      })
    };

    const addAssessmentUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId,
        headCommitApprovedTags: { $nin: [ userAssessment.tagId ] },
        headCommitRejectedTags: { $nin: [ userAssessment.tagId ] },
        $and: [
          { headCommitUserAssessments: { $nin: [ userAssessment ] } },
          mongoQueryAtLeastOneGroupOutsideUserLacksApproval
        ]
      },
      {
        $push: { "headCommitUserAssessments": userAssessment },
      }
    ).exec();

    if ( !mongoHelpers.updateOk(addAssessmentUpdateResult)
          || !mongoHelpers.updateMatchedOneResult(addAssessmentUpdateResult)
          || !mongoHelpers.updateModifiedOneResult(addAssessmentUpdateResult)
    ) {
      throw "value-meaningless error to skip to catch block";
    }

    return { tagId, status: "approval-success", tagApproved: false };

  } catch {

    // Second, try an atomic update assuming that this assessment will cause the tag to be approved.
    try {

      const mongoQueryAllGroupsOutsideUserHaveApproval = {
        $and: groupsWithoutUser.map((groupOwners) => {
          return {
            $in: groupOwners.map((owner) => {
              return createAssessment("approved", owner, tagId);
            })
          }
        })
      };

      const addApprovalUpdateResult = await PullRequestReviewModel.update(
        {
          repoId,
          pullRequestNumber,
          headCommitId: commitId,
          headCommitApprovedTags: { $nin: [ userAssessment.tagId ] },
          headCommitRejectedTags: { $nin: [ userAssessment.tagId ] },
          $and: [
            { headCommitUserAssessments: { $nin: [ userAssessment ] } },
            mongoQueryAllGroupsOutsideUserHaveApproval
          ]
        },
        {
          $push: {
            "headCommitUserAssessments": userAssessment,
            "headCommitApprovedTags": tagId
          },
        }
      ).exec();

      // TODO log error if needed.
      // TODO make these errors better (priority: for the head commit updating / tag already being approved/rejected)
      if ( !mongoHelpers.updateOk(addApprovalUpdateResult)
            || !mongoHelpers.updateMatchedOneResult(addApprovalUpdateResult)
            || !mongoHelpers.updateModifiedOneResult(addApprovalUpdateResult)
      ) {
        return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } };
      }

      return { tagId, status: "approval-success", tagApproved: true };

    } catch (updateErr) {

      // TODO log error.
      return { tagId, status: "approval-failure", error: { httpCode: 500, ...errors.internalServerError } };
    }
  }
}


// TODO Move
// TODO DOC
const addUserAssessment = async (repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups) => {

  if (userAssessment.assessmentType === "rejected") {
    return await addRejectionUserAssessment(repoId, pullRequestNumber, commitId, userAssessment);
  }

  return await addApprovalUserAssessment(repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups);
}


// TODO Move
// TODO DOC
// @REQUIRED tagsOwnerGroups has been checked to contain that tag for that user.
const addUserAssessments = async (repoId, pullRequestNumber, commitId, userAssessments, tagsOwnerGroups) => {
  return Promise.all(userAssessments.map((userAssessment) => {
    return addUserAssessment(repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups);
  }));
}
