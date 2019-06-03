// Module for defining error messages.

const notLoggedInError = "You must be logged in to access this endpoint...";

const noAccessToRepoError = "You do not have access to this repo...";

const noModifyingTagsYouDontOwn = "You can not perform this operation on tags that you don't own...";

const noModifyingTagsAfterConfirmation = "You cannot approve/reject tags once you've given confirmation...";

const noApprovingDocsBeforeAllTagsApproved = "You must approve all your tags before approving all your documentation...";

const noPullRequestReview = "Unable to find a review for that pull request...";

const noCommitReview = "Unable to find a review for that commit...";

const noUpdatingNonHeadCommit = "You can only update the head commit...";

const internalServerError = "There was an unknown internal server error...";

const noApprovingAlreadyApprovedTag = "You can't approve an already-approved tag...";

const noRejectingAlreadyRejectedTag = "You can't reject an alreay-rejected tag...";

const noApprovingRejectedTag = "You cannot approve a rejected tag...";

const noRejectingApprovedTag = "You can't reject an approved tag...";

const noRemovingApprovalOnUnapprovedTag = "You cannot remove approval on a tag that wasn't approved...";

const noRemovingRejectionOnUnrejectedTag = "You cannot remove rejection on a tag that wasn't rejected...";

module.exports = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noModifyingTagsYouDontOwn,
  noModifyingTagsAfterConfirmation,
  noApprovingDocsBeforeAllTagsApproved,
  noPullRequestReview,
  noCommitReview,
  noUpdatingNonHeadCommit,
  noApprovingAlreadyApprovedTag,
  noRejectingAlreadyRejectedTag,
  noApprovingRejectedTag,
  noRejectingApprovedTag,
  noRemovingApprovalOnUnapprovedTag,
  noRemovingRejectionOnUnrejectedTag
}
