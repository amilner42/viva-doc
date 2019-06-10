// Module for defining error messages.


const createErrorObject = (errorCode, message, optional) => {

  const baseError = { message, errorCode };

  if (optional !== undefined) {
    return { ...baseError, ...optional }
  }

  return baseError;
}


const notLoggedInError =
  createErrorObject(1, "You must be logged in to access this endpoint...");

const noAccessToRepoError =
  createErrorObject(2, "You do not have access to this repo...");

const noModifyingTagsYouDontOwn =
  createErrorObject(3, "You can not perform this operation on tags that you don't own...");

const noModifyingTagsAfterConfirmation =
  createErrorObject(4, "You cannot approve/reject tags once you've given confirmation...");

const noApprovingDocsBeforeAllTagsApproved =
  createErrorObject(5, "You must approve all your tags before approving all your documentation...");

const noApprovingDocsIfNotOnRemainingDocApprovalList =
  createErrorObject(6, "You are not on the list of remaining owners needed to approve docs...");

const noPullRequestReview =
  createErrorObject(7, "Unable to find a review for that pull request...");

const noCommitReview =
  createErrorObject(8, "Unable to find a review for that commit...");

const noRepo =
  createErrorObject(9, "Unable to find that repo...");

const noUpdatingNonHeadCommit = (newHeadCommitId) => {
  return createErrorObject(10, "You can only update the head commit...", { newHeadCommitId });
}

const internalServerError =
  createErrorObject(11, "There was an unknown internal server error...");

const noApprovingAlreadyApprovedTag =
  createErrorObject(12, "You can't approve an already-approved tag...");

const noRejectingAlreadyRejectedTag =
  createErrorObject(13, "You can't reject an alreay-rejected tag...");

const noApprovingRejectedTag =
  createErrorObject(14, "You cannot approve a rejected tag...");

const noRejectingApprovedTag =
  createErrorObject(15, "You can't reject an approved tag...");

const noRemovingApprovalOnUnapprovedTag =
  createErrorObject(16, "You cannot remove approval on a tag that wasn't approved...");

const noRemovingRejectionOnUnrejectedTag =
  createErrorObject(17, "You cannot remove rejection on a tag that wasn't rejected...");

const commitStillLoading =
  createErrorObject(18, "The analysis for the commit is still being calculated");


module.exports = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noModifyingTagsYouDontOwn,
  noModifyingTagsAfterConfirmation,
  noApprovingDocsBeforeAllTagsApproved,
  noApprovingDocsIfNotOnRemainingDocApprovalList,
  noPullRequestReview,
  noCommitReview,
  noRepo,
  noUpdatingNonHeadCommit,
  noApprovingAlreadyApprovedTag,
  noRejectingAlreadyRejectedTag,
  noApprovingRejectedTag,
  noRejectingApprovedTag,
  noRemovingApprovalOnUnapprovedTag,
  noRemovingRejectionOnUnrejectedTag,
  commitStillLoading
}
