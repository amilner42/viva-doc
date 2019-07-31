// Module for defining api error messages.


// TODO add http code to error objects...
const createErrorObject =
  ( errorCode: number
  , message: string
  , optional?: object
  ) : { message: string, errorCode: number } => {

  const baseError = { message, errorCode };

  if (optional !== undefined) {
    return { ...baseError, ...optional }
  }

  return baseError;
}


export const notLoggedInError =
  createErrorObject(1, "You must be logged in to access this endpoint...");

export const noAccessToRepoError =
  createErrorObject(2, "You do not have access to this repo...");

export const noModifyingTagsYouDontOwn =
  createErrorObject(3, "You can not perform this operation on tags that you don't own...");

export const noPullRequestReview =
  createErrorObject(7, "Unable to find a review for that pull request...");

export const noCommitReview =
  createErrorObject(8, "Unable to find a review for that commit...");

export const noRepo =
  createErrorObject(9, "Unable to find that repo...");

export const noUpdatingNonHeadCommit = (newHeadCommitId: string) => {
  return createErrorObject(10, "You can only update the head commit...", { newHeadCommitId });
}

export const internalServerError =
  createErrorObject(11, "There was an unknown internal server error...");

export const commitStillLoading =
  createErrorObject(18, "The analysis for the commit is still being calculated");

export const invalidRequestBodyType = (errMssg: string) => {
  return createErrorObject(19, errMssg)
}

export const invalidUrlParams = (errMssg: string) => {
  return createErrorObject(20, errMssg);
}

export const noModifyingTagsThatDontExist =
  createErrorObject(21, "You cannot modify tags that don't exist");

export const userAssmentsMustBeToUniqueTags =
  createErrorObject(22, "User assessments must all point to different tags");
