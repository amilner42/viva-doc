// Module for defining error messages.

const notLoggedInError = "You must be logged in to access this endpoint...";

const noAccessToRepoError = "You do not have access to this repo...";

const noAccessToApproveTagsError = "You can only approve tags that you own...";

const internalServerError = "There was an unknown internal server error...";

module.export = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noAccessToApproveTagsError
}
