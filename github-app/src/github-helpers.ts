// Module for github helpers.

import * as R from "ramda";

import * as Probot from 'probot';
import * as AppError from "./error";


const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve open PRs.
export const getOpenPullRequests =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , { repoName }: RepoIdAndName
        ) => {

  try {

    const response = await context.github.pulls.list({
      repo: repoName,
      owner,
      state: "open"
    })

    return response.data;

  } catch (err) {

    const getPullRequestsLoggableError: AppError.GithubAppLoggableError = {
      errorName: "github-retrieve-open-pull-requests-failure",
      githubAppError: true,
      loggable: true,
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName
      }
    };

    throw getPullRequestsLoggableError;
  }

}


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve open PRs for branch.
export const getOpenPullRequestNumbersForBranch =
  async ( installationId: number
        , context: Probot.Context
        , repoName: string
        , branchName: string
        , owner: string
        ) : Promise<number[]> => {

  try {

    const pullListResponse = await context.github.pulls.list({
      owner,
      repo: repoName,
      state: "open",
      head: `${owner}:${branchName}`
    })

    return R.map((datum) => { return datum.number },  pullListResponse.data)

  } catch (err) {

    const getPullRequestsLoggableError: AppError.GithubAppLoggableError = {
      errorName: "github-retrieve-open-pull-requests-for-branch-failure",
      githubAppError: true,
      loggable: true,
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: {
        err,
        repoName,
        branchName,
        owner
      }
    };

    throw getPullRequestsLoggableError;
  }

}


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve diff.
export const retrieveDiff = R.curry(
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , baseBranchNameOrCommitSHA: string
  , headBranchNameOrCommitSHA: string
  ) : Promise<string> => {

  try {

    // Need the correct accept header to get the diff:
    // Refer: https://developer.github.com/v3/media/#commits-commit-comparison-and-pull-requests
    const diffAcceptHeader = { accept: "application/vnd.github.v3.diff"}
    // Unfortunetly the typings are wrong, and they don't include `headers` even though octokit (which this wraps)
    // has that field, and of course we need to pass the correct header to get the correct media type. This is
    // why I have a `as any` at the end here, it is only because the typings are wrong.
    const diffResponse = await context.github.repos.compareCommits({
      headers: diffAcceptHeader,
      owner,
      repo: repoName,
      base: baseBranchNameOrCommitSHA,
      head: headBranchNameOrCommitSHA
    } as any);

    return diffResponse.data;

  } catch (err) {

    const retrieveDiffLoggableError: AppError.GithubAppLoggableError = {
      errorName: "retrieve-diff-failure",
      installationId,
      githubAppError: true,
      loggable: true,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName,
        baseBranchNameOrCommitSHA,
        headBranchNameOrCommitSHA
      }
    };

    throw retrieveDiffLoggableError;
  }

});


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve file.
export const retrieveFile = R.curry(
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoName: string
        , commitId: string
        , filePath: string
        ) : Promise<string> => {

  try {

    return await context.github.repos.getContents({
      owner,
      repo: repoName,
      path: filePath,
      ref: commitId
    })
    .then(R.path<any>(["data"]))
    .then((data) => {
      return (new Buffer(data.content, data.encoding)).toString("ascii")
    })

  } catch (err) {

    const failureToRetrieveFileLoggableError: AppError.GithubAppLoggableError = {
      errorName: "github-retrieve-file-failure",
      githubAppError: true,
      loggable: true,
      isSevere: false,
      data: {
        err,
        repoName,
        commitId,
        filePath
      },
      installationId,
      stack: AppError.getStack()
    }

    throw failureToRetrieveFileLoggableError;
  }

});


// @THROWS only `GithubAppLoggableError` upon failure to set status.
export const setCommitStatus = R.curry(
  async (installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , commitId: string
  , statusState: "success" | "failure" | "pending"
  , optional?: { description?: string, target_url?: string }
  ): Promise<void> => {

  try {

    const requiredSettings = {
      owner,
      repo: repoName,
      sha: commitId,
      context: VIVA_DOC_STATUS_NAME,
      state: statusState
    }

    const settings = optional ? { ...requiredSettings, ...optional } : requiredSettings

    await context.github.repos.createStatus(settings);

  } catch (err) {

    const setStatusLoggableError: AppError.GithubAppLoggableError = {
      errorName: "github-set-status-failure",
      githubAppError: true,
      loggable: true,
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        repoName,
        owner,
        commitId,
        statusState
      }
    }

    throw setStatusLoggableError;
  }

});


export interface RepoIdAndName {
  repoId: number;
  repoName: string;
}
