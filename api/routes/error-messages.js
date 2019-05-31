// Module for defining error messages.

const notLoggedInError = "You must be logged in to access this endpoint...";

const noAccessToRepoError = "You do not have access to this repo...";

const noAccessToApproveTagsError = "You can only approve tags that you own...";

const noAccessToRejectTagsError = "You can only reject your own tags...";

const noModifyingTagsAfterConfirmation = "You cannot approve/reject tags once you've given confirmation...";

const noApprovingDocsBeforeAllTagsApproved = "You must approve all your tags before approving all your documentation...";

const noPullRequestReview = "Unable to find a review for that pull request...";

const noCommitReview = "Unable to find a review for that commit...";

const noUpdatingNonHeadCommit = "You can only update the head commit...";

const internalServerError = "There was an unknown internal server error...";

const noApprovingAlreadyApprovedTag = "You can't approve an already-approved tag...";

const noApprovingRejectedTag = "You cannot approve a rejected tag...";

module.exports = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noAccessToApproveTagsError,
  noModifyingTagsAfterConfirmation,
  noAccessToRejectTagsError,
  noApprovingDocsBeforeAllTagsApproved,
  noPullRequestReview,
  noCommitReview,
  noUpdatingNonHeadCommit,
  noApprovingAlreadyApprovedTag,
  noApprovingRejectedTag
}
