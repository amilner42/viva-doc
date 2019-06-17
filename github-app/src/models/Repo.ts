import mongoose = require("mongoose")
import * as AppError from "../error";


export interface Repo {
  installationId: number;
  owner: string;
  repoIds: number[];
}


const RepoSchema = new mongoose.Schema({
  installationId: { type: Number, required: [true, "can't be blank"], index: true },
  owner: { type: String, required: [true, "can't be blank"] },
  repoIds: { type: [ Number ], required: [true, "can't be blank"], index: true }
});


const RepoModel = mongoose.model("Repo", RepoSchema);


/* DB HELPER FUNCTIONS */


// Initialize a new repo.
// @THROWS only `GithubAppLoggableError` upon failed creation.
export const newInstallation = async (installationId: number, owner: string, repoIds: number[], errorName: string) => {
  try {

    const repoObject: Repo = {
      installationId,
      owner,
      repoIds
    };
    const repo = new RepoModel(repoObject);

    await repo.save();

  } catch (err) {

    const initRepoLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: true,
      installationId,
      stack: AppError.getStack(),
      data: err
    }

    throw initRepoLoggableError;
  }
}


// Delete a repo and return the deleted repo.
// @THROWS only `GithubAppLoggableError` upon failed deletion.
export const deleteInstallation = async (installationId: number): Promise<Repo> => {

  try {

    const deleteRepoResult = await RepoModel.findOneAndDelete({ installationId }).exec();

    if (deleteRepoResult === null) throw "not-found";

    return deleteRepoResult.toObject();

  } catch (err) {

    const deleteRepoLoggableError: AppError.GithubAppLoggableError = {
      errorName: "delete-repo-failure",
      githubAppError: true,
      loggable: true,
      isSevere: false,
      installationId,
      data: err,
      stack: AppError.getStack()
    };

    throw deleteRepoLoggableError;
  }

}


// Adds repos to an insallation.
// @THROWS only `GithubAppLoggableError` upon failed insertion.
export const addReposToInstallaton =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ): Promise<void> => {

  try {

    const repoUpdateResult = await RepoModel.update(
      { installationId },
      { $addToSet: { "repoIds": { $each: repoIds } }}
    ).exec();

    if (repoUpdateResult.ok !== 1 || repoUpdateResult.n !== 1 || repoUpdateResult.nModified !== 1) {
      throw { updateQueryFailure: true
            , ok: repoUpdateResult.ok
            , n: repoUpdateResult.n
            , nModified: repoUpdateResult.nModified
            }
    }

  } catch (err) {

    const addReposLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: true,
      data: err,
      stack: AppError.getStack(),
      installationId
    }

    throw addReposLoggableError;
  }

}


// Remove `repoIds` from the given installation.
// @THROWS only `GithubAppLoggableError` upon failed deletion.
export const removeReposFromInstallation =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
      ): Promise<void> => {

  try {

    const repoUpdateResult = await RepoModel.update(
      { installationId },
      { $pull: { "repoIds": { $in: repoIds } } }
    ).exec();

    if (repoUpdateResult.ok !== 1 || repoUpdateResult.n !== 1 || repoUpdateResult.nModified !== 1) {
      throw { updateQueryFailed: true
            , ok: repoUpdateResult.ok
            , n: repoUpdateResult.n
            , nModified: repoUpdateResult.nModified
            }
    }

  } catch (err) {

    const removeReposLoggableError: AppError.GithubAppLoggableError = {
      errorName,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack(),
    };

    throw removeReposLoggableError;
  }

}
