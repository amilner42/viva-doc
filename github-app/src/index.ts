// Base module for probot app.

import * as Probot from 'probot' // eslint-disable-line no-unused-vars
import R from "ramda"
import mongoose = require("mongoose")

const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"

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

require("./models/PullRequestReview")
require("./models/CommitReview")

// All imports to internal modules should be here so that all mongoose schemas have loaded first
const PullRequestReview = mongoose.model('PullRequestReview')
import * as Analysis from "./analysis"

export = (app: Probot.Application) => {

  // On installation going to set the default branch to be protected.
  // @PROD This will not be the solution in production, but rather probably refer to the config file to figure out which
  // branches they'd like to integrate with VD.
  // app.on("installation.created", async (context) => {
  //   const repos = (await context.github.apps.listRepos({})).data.repositories
  //   await R.map((async repo => {
  //     const defaultBranch = repo.default_branch
  //     const owner = repo.owner.login
  //     const repoName = repo.name
  //     const branches = (await context.github.repos.listBranches({ owner, repo: repoName })).data
  //
  //     R.map((branch) => {
  //       const branchName = branch.name
  //       if (branchName === defaultBranch && branch.protected === false) {
  //         // @PROD Probably need to make sure this is just adding a rule and not replacing other existing rules.
  //         context.github.repos.updateBranchProtection({
  //           owner,
  //           repo: repoName,
  //           branch: branchName,
  //           required_status_checks: {
  //             strict: true,
  //             contexts: [ VIVA_DOC_STATUS_NAME ]
  //           },
  //           enforce_admins: true,
  //           required_pull_request_reviews: null,
  //           restrictions: null
  //         })
  //       }
  //     }, branches)
  //   }), repos)
  // })

  // TODO what about reopened?
  app.on("pull_request.opened", async (context) => {

    const prPayload = context.payload
    const { owner } = context.repo()
    const repoId = (prPayload.repository as any).id
    const repoFullName: string = (prPayload.repository as any).full_name
    const repoName: string = (prPayload.repository as any).name
    const branchName: string = (prPayload.pull_request as any).head.ref
    const pullRequestId: number = (prPayload.pull_request as any).id
    const pullRequestNumber: number = (prPayload.pull_request as any).number
    const headCommitId = (prPayload.pull_request as any).head.sha

    const baseBranchName = (prPayload.pull_request as any).base.ref
    const baseCommitId = (prPayload.pull_request as any).base.sha

    const pullRequestReview = new PullRequestReview({
      repoId,
      repoFullName,
      branchName,
      baseBranchName,
      pullRequestId,
      pullRequestNumber,
      headCommitId,
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitRemainingOwnersToApproveDocs: null,
      headCommitTagsAndOwners: null,
      pendingAnalysisForCommits: [ headCommitId ],
      currentAnalysisLastCommitWithSuccessStatus: baseCommitId,
      currentAnalysisLastAnalyzedCommit: null
    })

    try {
      await pullRequestReview.save();
    } catch (err) {
      // TODO Handle error
      console.log(`Error saving pull request review: ${err} - ${JSON.stringify(err)}`)
    }

    // TODO CONTINUE trigger pipeline

    // Analysis.pipeline(
    //   repoId,
    //   repoFullName,
    //   branchName,
    //   headCommitId,
    //   () => getBranchReviewUrl(repoId, prNumber, headCommitId),
    //   () => retrieveDiff(context, owner, repoName, baseBranchName, branchName),
    //   retrieveFiles(context, owner, repoName, baseCommitId, headCommitId),
    //   setStatus(context, owner, repoName, headCommitId)
    // ).catch((err: any) => {
    //   console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
    // })
  })

  app.on("push", async (context) => {

    // TODO check if this push is for tags / branches to prevent errors below.

    const pushPayload = context.payload
    const repoId: string = (pushPayload.repository as any).id
    const repoName: string = (pushPayload.repository as any).name
    const branchName: string = (R.last(pushPayload.ref.split("/")) as any) // TODO errors?
    const { owner } = context.repo()
    const headCommitId: string = pushPayload.after

    const prNumbers = await getOpenPullRequestsForBranch(context, repoName, branchName, owner)

    // Perform analysis on all relevant open PRs.
    await R.map( async (pullRequestNumber) => {

      const pullRequestReview = await PullRequestReview.findOneAndUpdate(
        { repoId, pullRequestNumber },
        { $push: { "pendingAnalysisForCommits": headCommitId }}
      ).exec();

      // TODO handle error better?
      if (pullRequestReview === null) {
        const errMessage =
          `Missing PullRequestReview object for --- repoId: ${repoId}, prNumber: ${pullRequestNumber}`
        console.log(errMessage);
        return;
      }

      const pullRequestReviewObject = pullRequestReview.toObject();

      if (pullRequestReviewObject.pendingAnalysisForCommits.length === 1) {
        // TODO CONTINUE trigger pipeline
        return
      }

      // Otherwise there is already something being analyzed and this will be analyzed in order when all other
      // commits finish being analyzed.
      return;

    }, prNumbers)

   })
}

/** Return an array of pull request numbers representing open pull requests for that branch.

TODO Check can we ever even get more than one? I think maybe if the same branch has 2 PRs for 2 dif base branches?

TODO handle errors?
*/
const getOpenPullRequestsForBranch =
  async (context: Probot.Context, repoName: string, branchName: string, owner: string)
  : Promise<Number[]> => {

  // TODO check this is good when under an organization?
  const pullListResponse = await context.github.pulls.list({
    owner,
    repo: repoName,
    state: "open",
    head: `${owner}:${branchName}`
  })

  return R.map((datum) => { return datum.number },  pullListResponse.data)
}

/** TODO DOC */
const retrieveDiff = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repo: string
  , baseBranchNameOrCommitSHA: string
  , headBranchNameOrCommitSHA: string
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
    base: baseBranchNameOrCommitSHA,
    head: headBranchNameOrCommitSHA
  } as any).then(R.path(["data"]))
})

/** TODO DOC */
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

/** TODO DOC */
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


/** TODO DOC

TODO add env for prod.
 */
const getBranchReviewUrl = (repoId: string, prNumber: number, commitId: string): string => {
  return `http://localhost:8080/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
}
