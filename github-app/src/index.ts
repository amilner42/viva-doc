// Base module for probot app.

// WARNING: Do not import internal modules here, import them below.
import * as Probot from 'probot' // eslint-disable-line no-unused-vars
import R from "ramda"
import mongoose = require("mongoose")


interface RepoIdAndName {
  repoId: number;
  repoName: string;
}


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


require("./models/PullRequestReview");
require("./models/CommitReview");
require("./models/Repo");
require("./models/LoggableError");


// All imports to internal modules should be here so that all mongoose schemas have loaded first.
const PullRequestReviewModel = mongoose.model('PullRequestReview')
const RepoModel = mongoose.model("Repo")
const CommitReviewModel = mongoose.model('CommitReview')
import { Repo } from "./models/Repo"
import { PullRequestReview } from "./models/PullRequestReview"
import * as Analysis from "./analysis"
import * as AppError from "./error"


export = (app: Probot.Application) => {


  app.on("installation.created", async (context) => {
    AppError.webhookErrorWrapper("installation.created", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id
      const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

      const repoIdsAndNames: RepoIdAndName[] = R.map((repo) => {
        return { repoName: repo.name, repoId: repo.id };
      }, payload.repositories);

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

      await initializeRepoModel(installationId, owner, repoIds);
      await analyzeAlreadyOpenPrsForRepos(context, owner, repoIdsAndNames);

    });
  });


  app.on("installation.deleted", async (context) => {
    AppError.webhookErrorWrapper("installation.deleted", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id

      let deletedRepoDocument: mongoose.Document;

      // Delete Repo Document
      try {

        const deleteRepoResult = await RepoModel.findOneAndDelete({ installationId }).exec();

        if (deleteRepoResult === null) throw "not-found";

        deletedRepoDocument = deleteRepoResult;

      } catch (err) {

        const deleteRepoLoggableError: AppError.GithubAppLoggableError = {
          errorName: "delete-repo-failure",
          githubAppError: true,
          loggable: true,
          isSevere: true,
          installationId,
          data: err,
          stack: AppError.getStack()
        };

        throw deleteRepoLoggableError;
      }

      const repoIds = (deletedRepoDocument.toObject() as Repo).repoIds;

      // Delete CommitReview Document(s)
      try {

        const deleteCommitReviewsResult = await CommitReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

        if (deleteCommitReviewsResult.ok !== 1) {
          throw `delete commit review result not ok: ${deleteCommitReviewsResult.ok}`;
        }

      } catch (err) {

        const deleteCommitReviewsLoggableError: AppError.GithubAppLoggableError = {
          errorName: "delete-repo-delete-commit-reviews-failure",
          githubAppError: true,
          loggable: true,
          isSevere: true,
          installationId,
          stack: AppError.getStack(),
          data: err
        }

        throw deleteCommitReviewsLoggableError;
      }

      // Delete PullRequest Document(s)
      try {

        const deletePullRequestReviewsResult =
          await PullRequestReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

        if (deletePullRequestReviewsResult.ok !== 1) {
          throw `delete pull request result not ok: ${deletePullRequestReviewsResult.ok}`;
        }

      } catch (err) {

        const deletePullRequestReviewLoggableError: AppError.GithubAppLoggableError = {
          errorName: "delete-repo-delete-pull-request-reviews-failure",
          githubAppError: true,
          loggable: true,
          isSevere: true,
          data: err,
          installationId,
          stack: AppError.getStack()
        }

        throw deletePullRequestReviewLoggableError;
      }

    });
  });

  app.on("installation_repositories.added", async (context) => {
    AppError.webhookErrorWrapper("installation_repositories.added", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id
      const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

      const repoIdsAndNames: RepoIdAndName[] = R.map((repoAdded) => {
        return { repoName: repoAdded.name, repoId: repoAdded.id };
      }, payload.repositories_added)

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

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
          errorName: "add-repos-failure",
          githubAppError: true,
          loggable: true,
          isSevere: true,
          data: err,
          stack: AppError.getStack(),
          installationId
        }

        throw addReposLoggableError;
      }

      await analyzeAlreadyOpenPrsForRepos(context, owner, repoIdsAndNames);

    });
  });


  app.on("installation_repositories.removed", async (context) => {
    AppError.webhookErrorWrapper("installation_repositories.removed", async () => {

      const payload = context.payload;
      const installationId = (payload.installation as any).id;
      const reposToRemove: number[] = R.map((repoToRemove) => {
        return repoToRemove.id
      }, payload.repositories_removed);


      const clearRemovedRepoData = async () => {

        const repoUpdateResult = await RepoModel.update(
          { installationId },
          { $pull: { "repoIds": { $in: reposToRemove } } }
        );

        if (repoUpdateResult.ok !== 1 || repoUpdateResult.n !== 1 || repoUpdateResult.nModified !== 1) {
          throw "ERROR"
        }

        const deleteCommitReviewsResult =
          await CommitReviewModel.deleteMany({ repoId: { $in: reposToRemove } }).exec();

        if (deleteCommitReviewsResult.ok !== 1) {
          throw "ERROR";
        }

        const deletePullRequestReviewsResult =
          await PullRequestReviewModel.deleteMany({ repoId: { $in: reposToRemove } }).exec();

        if (deletePullRequestReviewsResult.ok !== 1) {
          throw "ERROR";
        }

      }

      try {

        await clearRemovedRepoData();

      } catch (err) {

        console.log(`Error: Could not remove ${reposToRemove.length} repo(s) from installation ${installationId}`)
      }

    });
  });


  app.on("pull_request.opened", async (context) => {
    AppError.webhookErrorWrapper("pull_request.opened", async () => {

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

      await analyzeNewPullRequest(
        context,
        owner,
        repoId,
        repoName,
        repoFullName,
        branchName,
        baseBranchName,
        pullRequestId,
        pullRequestNumber,
        headCommitId,
        baseCommitId
      );

    });
  });


  app.on("push", async (context) => {
    AppError.webhookErrorWrapper("push", async () => {

      const pushPayload = context.payload

      // The push was for a tag or a new branch (set upstream...), couldn't be for an open PR, no need for analysis.
      if (pushPayload.before === "0000000000000000000000000000000000000000") {
        console.log("skipped");
        return;
      }

      const repoId: number = (pushPayload.repository as any).id
      const repoName: string = (pushPayload.repository as any).name
      const branchName: string = (R.last(pushPayload.ref.split("/")) as any) // TODO errors?
      const { owner } = context.repo()
      const headCommitId: string = pushPayload.after

      const prNumbers = await getOpenPullRequestNumbersForBranch(context, repoName, branchName, owner)

      // Perform analysis on all relevant open PRs.
      R.map( async (pullRequestNumber) => {

        const pullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
          { repoId, pullRequestNumber },
          {
            $push: { "pendingAnalysisForCommits": headCommitId },
            headCommitId: headCommitId,
            headCommitApprovedTags: null,
            headCommitRejectedTags: null,
            headCommitRemainingOwnersToApproveDocs: null,
            headCommitTagsAndOwners: null,
            loadingHeadAnalysis: true
          },
          {
            new: false
          }
        ).exec();

        // TODO handle error better?
        if (pullRequestReview === null) {
          const errMessage =
            `Missing PullRequestReview object for --- repoId: ${repoId}, prNumber: ${pullRequestNumber}`
          console.log(errMessage);
          return;
        }

        const previousPullRequestReviewObject: PullRequestReview = pullRequestReview.toObject();

        // If there are already commits being analyzed in the pipeline, so there is no need to trigger the pipeline or
        // save a previous CommitReviewObject.
        if (previousPullRequestReviewObject.pendingAnalysisForCommits.length !== 0) {
          return;
        }

        // Otherwise we need to save the old CommitReviewObject and trigger the analysis pipeline.

        const commitReviewUpdateResult = await CommitReviewModel.update(
          { repoId, pullRequestNumber, commitId: previousPullRequestReviewObject.headCommitId },
          {
            approvedTags: previousPullRequestReviewObject.headCommitApprovedTags,
            rejectedTags: previousPullRequestReviewObject.headCommitRejectedTags,
            remainingOwnersToApproveDocs: previousPullRequestReviewObject.headCommitRemainingOwnersToApproveDocs,
            frozen: true
          }
        );

        // TODO HANDLE ERROR better
        if (commitReviewUpdateResult.n !== 1 || commitReviewUpdateResult.nModified !== 1) {
          const errMessage = `Failed to update previous commit: ${JSON.stringify({ repoId, pullRequestNumber, commitId: previousPullRequestReviewObject.headCommitId },)}`;
          console.log(errMessage);
        }

        // Construct the new PRO from previous one.
        const pullRequestReviewObject: PullRequestReview =
          { ...previousPullRequestReviewObject,
            ...{
              headCommitId,
              pendingAnalysisForCommits: [ headCommitId ],
              headCommitApprovedTags: null,
              headCommitRejectedTags: null,
              headCommitRemainingOwnersToApproveDocs: null,
              headCommitTagsAndOwners: null,
              loadingHeadAnalysis: true
            },
          ...{
              // An unlikely race condition, but just in case, if the last commit had no remaining owners to approve dos
              // then it is the last success commit. Because first that is pulled and then only after is success set
              // there is a chance this runs between the 2 db operations.
              currentAnalysisLastCommitWithSuccessStatus:
                (previousPullRequestReviewObject.headCommitRemainingOwnersToApproveDocs === [])
                  ? previousPullRequestReviewObject.headCommitId
                  : previousPullRequestReviewObject.currentAnalysisLastCommitWithSuccessStatus
            }
          }

        await Analysis.pipeline(
          pullRequestReviewObject,
          getClientUrlForCommitReview(repoId, pullRequestNumber),
          retrieveDiff(context, owner, repoName),
          retrieveFile(context, owner, repoName),
          setCommitStatus(context, owner, repoName)
        )

      }, prNumbers)

    });
  });

}


// Initializes the repo model.
//
// Throws only `AppError.GithubAppLoggableError` upon failure.
const initializeRepoModel = async (installationId: number, owner: string, repoIds: number[]) => {
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
      githubAppError: true,
      loggable: true,
      isSevere: true,
      errorName: "init-repo-failure",
      installationId,
      stack: AppError.getStack(),
      data: err
    }

    throw initRepoLoggableError;
  }
}


const analyzeNewPullRequest =
  async ( context: Probot.Context
  , owner: string
  , repoId: number
  , repoName: string
  , repoFullName: string
  , branchName: string
  , baseBranchName: string
  , pullRequestId: number
  , pullRequestNumber: number
  , headCommitId : string
  , baseCommitId : string
  ) : Promise<void> => {

  const pullRequestReviewObject: PullRequestReview = {
    repoId,
    repoName,
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
    currentAnalysisLastAnalyzedCommit: null,
    loadingHeadAnalysis: true
  }

  const pullRequestReview = new PullRequestReviewModel(pullRequestReviewObject)

  await pullRequestReview.save();

  await Analysis.pipeline(
    pullRequestReviewObject,
    getClientUrlForCommitReview(repoId, pullRequestNumber),
    retrieveDiff(context, owner, repoName),
    retrieveFile(context, owner, repoName),
    setCommitStatus(context, owner, repoName)
  ).catch((err) => {
    console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
  })

  return;
}


// TODO HANDLE ERRORS
const analyzeAlreadyOpenPrsForRepos = async (context: Probot.Context, owner: string, repoIdsAndNames: RepoIdAndName[]) => {

  for (let repoIdAndName of repoIdsAndNames) {
    await analyzeAlreadyOpenPrs(context, owner, repoIdAndName);
  }

}


const analyzeAlreadyOpenPrs = async (context: Probot.Context, owner: string, repoIdAndName: RepoIdAndName) => {

  const openPrs = await getOpenPullRequests(context, owner, repoIdAndName);

  for (let openPr of openPrs) {

    const repoId = openPr.head.repo.id;
    const repoName = openPr.head.repo.name;
    const repoFullName = openPr.head.repo.full_name;
    const branchName = openPr.head.ref;
    const baseBranchName = openPr.base.ref;
    const pullRequestId = openPr.id;
    const pullRequestNumber = openPr.number;
    const headCommitId = openPr.head.sha;
    const baseCommitId = openPr.base.sha;

    await analyzeNewPullRequest(
      context,
      owner,
      repoId,
      repoName,
      repoFullName,
      branchName,
      baseBranchName,
      pullRequestId,
      pullRequestNumber,
      headCommitId,
      baseCommitId
    );

  }

}


const getOpenPullRequests = async (context: Probot.Context, owner: string, { repoName }: RepoIdAndName) => {

  const response = await context.github.pulls.list({
    repo: repoName,
    owner,
    state: "open"
  })

  return response.data;

}


const getOpenPullRequestNumbersForBranch =
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
const getClientUrlForCommitReview = R.curry((repoId: number, prNumber: number, commitId: string): string => {
  return `http://localhost:8080/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
})
