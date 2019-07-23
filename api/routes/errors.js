// Module for defining error messages.


// TODO add http code to error objects...
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

const commitStillLoading =
  createErrorObject(18, "The analysis for the commit is still being calculated");

const invalidRequestBodyType = (errMssg) => {
  return createErrorObject(19, errMssg)
}

const invalidUrlParams = (errMssg) => {
  return createErrorObject(20, errMssg);
}

const noModifyingTagsThatDontExist =
  createErrorObject(21, "You cannot modify tags that don't exist");

const userAssmentsMustBeToUniqueTags =
  createErrorObject(22, "User assessments must all point to different tags");


module.exports = {
  notLoggedInError,
  noAccessToRepoError,
  internalServerError,
  noModifyingTagsYouDontOwn,
  noPullRequestReview,
  noCommitReview,
  noRepo,
  noUpdatingNonHeadCommit,
  commitStillLoading,
  invalidRequestBodyType,
  invalidUrlParams,
  noModifyingTagsThatDontExist,
  userAssmentsMustBeToUniqueTags
}
