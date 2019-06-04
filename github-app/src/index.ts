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
require("./models/Repo")

// All imports to internal modules should be here so that all mongoose schemas have loaded first
const PullRequestReviewModel = mongoose.model('PullRequestReview')
const RepoModel = mongoose.model("Repo")
import { Repo } from "./models/Repo"
import { PullRequestReview } from "./models/PullRequestReview"
import * as Analysis from "./analysis"

export = (app: Probot.Application) => {

  app.on("installation.created", async (context) => {

    const payload = context.payload
    const installationId = (payload.installation as any).id
    const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

    const repos = R.map((repo) => {
      return { repoId: repo.id, repoName: repo.name }
    }, payload.repositories)

    const repoObject: Repo = {
      installationId,
      owner,
      repos
    }

    const repo = new RepoModel(repoObject);

    try {
      await repo.save();
    } catch (err) {
      // TODO LOG ERROR
      console.log(`Error saving new installation: ${installationId}`)
    }

  })

  // TODO delete all data for all repos as well
  app.on("installation.deleted", async (context) => {

    const payload = context.payload
    const installationId = (payload.installation as any).id

    const deleteRepoResult = await RepoModel.deleteOne({ installationId }) as { ok: number, deletedCount: number, n: number };

    if (deleteRepoResult.ok === 1 && deleteRepoResult.n === 1 && deleteRepoResult.deletedCount === 1) {
      return;
    }

    // LOG ERROR
    console.log(`Error deleting installation with id: ${installationId}`);
  })

  app.on("installation_repositories.added", async (context) => {

    const payload = context.payload
    const installationId = (payload.installation as any).id
    const reposToAdd = R.map((repoAdded) => {
      return { repoId: repoAdded.id, repoName: repoAdded.name }
    }, payload.repositories_added)

    const repoUpdateResult = await RepoModel.update(
      { installationId },
      { $addToSet: { "repos": { $each: reposToAdd } }}
    )

    if (repoUpdateResult.ok === 1 && repoUpdateResult.n === 1 && repoUpdateResult.nModified === 1) {
      return
    }

    // TODO HANDLE ERROR
    console.log(`Error: Could not save ${reposToAdd.length} repo(s) to installation ${installationId}`);
  })

  // TODO delete all repo data as well
  app.on("installation_repositories.removed", async (context) => {

    const payload = context.payload;
    const installationId = (payload.installation as any).id;
    const reposToRemove = R.map((repoRemoved) => {
      return { repoId: repoRemoved.id, repoName: repoRemoved.name };
    }, payload.repositories_removed);

    const repoUpdateResult = await RepoModel.update(
      { installationId },
      { $pull: { "repos": { $in: reposToRemove } } }
    )

    if (repoUpdateResult.ok === 1 && repoUpdateResult.n === 1 && repoUpdateResult.nModified === 1) {
      return
    }

    // TODO HANDLE ERROR
    console.log(`Error: Could not remove ${reposToRemove.length} repo(s) from installation ${installationId}`)
  })

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

    const pullRequestReviewObject: PullRequestReview = {
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
    }

    const pullRequestReview = new PullRequestReviewModel(pullRequestReviewObject)

    try {
      await pullRequestReview.save();
    } catch (err) {
      // TODO Handle error
      console.log(`Error saving pull request review: ${err} - ${JSON.stringify(err)}`)
    }

    await Analysis.pipeline(
      pullRequestReviewObject,
      getClientUrlForCommitReview(repoId, pullRequestNumber),
      retrieveDiff(context, owner, repoName),
      retrieveFile(context, owner, repoName),
      setCommitStatus(context, owner, repoName)
    ).catch((err) => {
      console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
    })

    return
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

      const pullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
        { repoId, pullRequestNumber },
        {
          $push: { "pendingAnalysisForCommits": headCommitId },
          headCommitId: headCommitId,
          headCommitApprovedTags: null,
          headCommitRejectedTags: null,
          headCommitRemainingOwnersToApproveDocs: null,
          headCommitTagsAndOwners: null
        },
        {
          new: true
        }
      ).exec();

      // TODO handle error better?
      if (pullRequestReview === null) {
        const errMessage =
          `Missing PullRequestReview object for --- repoId: ${repoId}, prNumber: ${pullRequestNumber}`
        console.log(errMessage);
        return;
      }

      const pullRequestReviewObject: PullRequestReview = pullRequestReview.toObject();

      if (pullRequestReviewObject.pendingAnalysisForCommits.length === 1) {
        await Analysis.pipeline(
          pullRequestReviewObject,
          getClientUrlForCommitReview(repoId, pullRequestNumber),
          retrieveDiff(context, owner, repoName),
          retrieveFile(context, owner, repoName),
          setCommitStatus(context, owner, repoName)
        ).catch((err) => {
          console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
        })
        return
      }

      // Otherwise there is already something being analyzed and this will be analyzed in order when all other
      // commits finish being analyzed.
      return

    }, prNumbers)

   })
}


/** Return an array of pull request numbers representing open pull requests for that branch.

TODO Check can we ever even get more than one? I think maybe if the same branch has 2 PRs for 2 dif base branches?

TODO handle errors?
*/
const getOpenPullRequestsForBranch =
  async (context: Probot.Context, repoName: string, branchName: string, owner: string)
  : Promise<number[]> => {

  // TODO check this is good when under an organization?
  const pullListResponse = await context.github.pulls.list({
    owner,
    repo: repoName,
    state: "open",
    head: `${owner}:${branchName}`
  })

  return R.map((datum) => { return datum.number },  pullListResponse.data)
}


const retrieveDiff = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repoName: string
  , baseBranchNameOrCommitSHA: string
  , headBranchNameOrCommitSHA: string
  ) : Promise<string> => {

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
})


const retrieveFile = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repoName: string
  , commitId: string
  , filePath: string
  ) : Promise<string> => {

  return context.github.repos.getContents({
    owner,
    repo: repoName,
    path: filePath,
    ref: commitId
  })
  .then(R.path<any>(["data"]))
  .then((data) => {
    return (new Buffer(data.content, data.encoding)).toString("ascii")
  })

})


const setCommitStatus = R.curry(
  async ( context: Probot.Context
  , owner: string
  , repoName: string
  , commitId: string
  , statusState: "success" | "failure" | "pending"
  , optional?: { description?: string, target_url?: string }
  ) => {

  const requiredSettings = {
    owner,
    repo: repoName,
    sha: commitId,
    context: VIVA_DOC_STATUS_NAME,
    state: statusState
  }

  const settings = optional ? { ...requiredSettings, ...optional } : requiredSettings

  return context.github.repos.createStatus(settings).then(R.path(["data"]))
})


// TODO add env for prod.
const getClientUrlForCommitReview = R.curry((repoId: string, prNumber: number, commitId: string): string => {
  return `http://localhost:8080/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
})
