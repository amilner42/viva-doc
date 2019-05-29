// Module for defining error messages.

const notLoggedInError = "You must be logged in to access this endpoint...";

const noAccessToRepoError = "You do not have access to this repo...";

const noAccessToApproveTagsError = "You can only approve tags that you own...";

const noAccessToRejectTagsError = "You can only reject your own tags...";

const noModifyingTagsAfterConfirmation = "You cannot approve/reject tags once you've given confirmation...";

const noApprovingDocsBeforeAllTagsApproved = "You must approve all your tags before approving all your documentation...";

const internalServerError = "There was an unknown internal server error...";

module.exports = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noAccessToApproveTagsError,
  noModifyingTagsAfterConfirmation,
  noAccessToRejectTagsError,
  noApprovingDocsBeforeAllTagsApproved
}
