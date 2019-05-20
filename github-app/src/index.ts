// Base module for probot app.

import * as Probot from 'probot' // eslint-disable-line no-unused-vars
import R from "ramda"
import mongoose = require("mongoose")

const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"

// TODO add env for prod
const getBranchReviewUrl = (repoId: string, branchName: string, commitId: string): string => {
  return `http://localhost:8080/review/repo/${repoId}/branch/${branchName}/commit/${commitId}`
}

// TODO add prod env for mongo uri
mongoose.connect('mongodb://localhost/viva-doc-dev', { useNewUrlParser: true }, (err) => {
  if (err) {
   console.log(err.message);
   console.log(err);
  }
  else {
    console.log('Connected to MongoDb');
  }
})

require("./models/BranchReview")
require("./models/BranchReviewMetadata")

// All imports to internal modules should be here so that all mongoose schemas have loaded first
import * as Analysis from "./analysis"

export = (app: Probot.Application) => {

  // On installation going to set the default branch to be protected.
  // @PROD This will not be the solution in production, but rather probably refer to the config file to figure out which
  // branches they'd like to integrate with VD.
  app.on("installation.created", async (context) => {
    const repos = (await context.github.apps.listRepos({})).data.repositories
    await R.map((async repo => {
      const defaultBranch = repo.default_branch
      const owner = repo.owner.login
      const repoName = repo.name
      const branches = (await context.github.repos.listBranches({ owner, repo: repoName })).data

      R.map((branch) => {
        const branchName = branch.name
        if (branchName === defaultBranch && branch.protected === false) {
          // @PROD Probably need to make sure this is just adding a rule and not replacing other existing rules.
          context.github.repos.updateBranchProtection({
            owner,
            repo: repoName,
            branch: branchName,
            required_status_checks: {
              strict: true,
              contexts: [ VIVA_DOC_STATUS_NAME ]
            },
            enforce_admins: true,
            required_pull_request_reviews: null,
            restrictions: null
          })
        }
      }, branches)
    }), repos)
  })

  app.on("push", async (context) => {

    const pushPayload = context.payload
    const repoId: string = (pushPayload.repository as any).id
    const repoFullName: string = (pushPayload.repository as any).full_name
    const repoName: string = (pushPayload.repository as any).name
    const branchName: string = (R.last(pushPayload.ref.split("/")) as any) // TODO errors?
    const { owner } = context.repo()
    const headCommitId: string = pushPayload.after

    const baseBranchInfo = await getBaseBranch(context, repoName, branchName, owner)
    if (baseBranchInfo === null) { return }
    const { baseBranchName, baseBranchId } = baseBranchInfo

    Analysis.pipeline(
      repoId,
      repoFullName,
      branchName,
      headCommitId,
      () => getBranchReviewUrl(repoId, branchName, headCommitId),
      () => retrieveDiff(context, owner, repoName, baseBranchName, branchName),
      retrieveFiles(context, owner, repoName, baseBranchId, headCommitId),
      setStatus(context, owner, repoName, headCommitId)
    ).catch((err: any) => {
      console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
    })

   })

}

const getBaseBranch = R.curry(
  async (context: Probot.Context, repoName: string, branchName: string, owner: string)
  : Promise<null | { baseBranchName: string, baseBranchId: string }> => {

  // TODO check this is good when under an organization?
  const pullListResponse = await context.github.pulls.list({
    owner,
    repo: repoName,
    state: "open",
    head: `${owner}:${branchName}`
  })

  if (pullListResponse.data.length === 0) {
    return null;
  }

  if (pullListResponse.data.length > 1) {
    throw new Error(`Not sure which diff to use with ${pullListResponse.data.length} PRs`)
  }

  const pullRequest = pullListResponse.data[0]

  return { baseBranchName: pullRequest.base.ref, baseBranchId: pullRequest.base.sha }
})

const retrieveDiff = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repo: string
  , baseBranchName: string
  , headBranchName: string
  ) : Promise<any> => {

  // Need the correct accept header to get the diff:
  // Refer: https://developer.github.com/v3/media/#commits-commit-comparison-and-pull-requests
  const diffAcceptHeader = { accept: "application/vnd.github.v3.diff"}
  // Unfortunetly the typings are wrong, and they don't include `headers` even though octokit (which this wraps)
  // has that field, and of course we need to pass the correct header to get the correct media type. This is
  // why I have a `as any` at the end here, it is only because the typings are wrong.
  return context.github.repos.compareCommits({
    headers: diffAcceptHeader,
    owner,
    repo,
    base: baseBranchName,
    head: headBranchName
  } as any).then(R.path(["data"]))
})

const retrieveFiles = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repo: string
  , baseCommitId: string
  , headCommitId: string
  , previousFilePath: string
  , currentFilePath: string
  ) : Promise<[string, string]> => {

  const getFile = async (commitId: string, path: string): Promise<string> => {
    return context.github.repos.getContents({
      owner,
      repo,
      path,
      ref: commitId
    })
    .then(R.path<any>(["data"]))
    .then((data) => {
      return (new Buffer(data.content, data.encoding)).toString("ascii")
    })
  }


  const previousFile = await getFile(baseCommitId, previousFilePath)
  const currentFile = await getFile(headCommitId, currentFilePath)

  return [ previousFile, currentFile ]
})

const setStatus = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repo: string
  , commitId: string
  , statusState: "success" | "failure" | "pending"
  , optional?: { description?: string, target_url?: string }
  ) => {

  const requiredSettings = {
    owner,
    repo,
    sha: commitId,
    context: VIVA_DOC_STATUS_NAME,
    state: statusState
  }

  const settings = optional ? { ...requiredSettings, ...optional } : requiredSettings

  return context.github.repos.createStatus(settings).then(R.path(["data"]))
})
