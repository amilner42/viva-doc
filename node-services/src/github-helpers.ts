// Module for github helpers.

import * as R from "ramda";

import * as Probot from 'probot';
import * as T from "./types";
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
      isSevere: true,
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


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve diff.
// @REFER https://developer.github.com/v3/repos/commits/#compare-two-commits
//     - Refer to GitHub API to see format of `baseRef` and `headRef`
export const retrieveDiff = R.curry(
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , baseRef: string
  , headRef: string
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
      base: baseRef,
      head: headRef
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
        baseRef,
        headRef
      }
    };

    throw retrieveDiffLoggableError;
  }

});


// @THROWS only `GithubApp.LoggableError` upon failure to retrieve file.
// @REFER https://developer.github.com/v3/repos/contents/#get-contents
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
  , optional: { description?: string, target_url?: string }
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
      isSevere: true,
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


export type PullRequestCommits = T.Unpacked<ReturnType<typeof listPullRequestCommits>>


// TODO Check if pagination works when >250 commits, DOCS OUT OF DATE.
// @REFER https://developer.github.com/v3/pulls/#list-commits-on-a-pull-request
// @THROWS only `GithubAppLoggableError` upon failure to get pull request commits.
export const listPullRequestCommits =
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , pullRequestNumber: number
  ) => {

  try {

    const allCommits = [];
    const per_page = 100; // max allowed
    let page = 1;

    // Get all commits one page at a time.
    while (true) {

      const pullRequestCommitsResponse = await context.github.pulls.listCommits({
        owner,
        repo: repoName,
        number: pullRequestNumber,
        per_page,
        page
      });

      const commits = pullRequestCommitsResponse.data;
      allCommits.push(...commits);

      // Could be more results on future pages.
      if (commits.length === 100) {
        page++;
      } else {
        break;
      }
    }

    return allCommits;

  } catch (err) {

    const getPullRequestCommitsLoggableError: AppError.GithubAppLoggableError = {
      errorName: "github-get-pull-request-commits-failure",
      githubAppError: true,
      loggable: true,
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName,
        pullRequestNumber
      }
    };

    throw getPullRequestCommitsLoggableError;
  }
}


export interface RepoIdAndName {
  repoId: number;
  repoName: string;
}
