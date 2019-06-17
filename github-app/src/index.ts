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

// NOTE: Order of these requires matters, LoggableError must be first.
require("./models/LoggableError");
require("./models/PullRequestReview");
require("./models/CommitReview");
require("./models/Repo");


// All imports to internal modules should be here so that all mongoose schemas have loaded first.
const PullRequestReviewModel = mongoose.model('PullRequestReview')
import * as Repo from "./models/Repo";
import * as CommitReview from "./models/CommitReview";
import * as PullRequestReview from "./models/PullRequestReview";
import * as Analysis from "./analysis"
import * as AppError from "./error"
import * as PromisesExtra from "./promises-extra"


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

      await Repo.newInstallation(installationId, owner, repoIds, "init-repo-failure");

      await analyzeAlreadyOpenPrsForRepos(context, owner, repoIdsAndNames);

    });
  });


  app.on("installation.deleted", async (context) => {
    AppError.webhookErrorWrapper("installation.deleted", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id

      const deletedRepo: Repo.Repo = await Repo.deleteInstallation(installationId);

      await CommitReview.deleteCommitReviewsForRepos(
        installationId,
        deletedRepo.repoIds,
        "delete-repo-delete-commit-reviews-failure"
      );

      await PullRequestReview.deletePullRequestReviewsForRepos(
        installationId,
        deletedRepo.repoIds,
        "delete-repo-delete-pull-request-reviews-failure"
      );

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

      await Repo.addReposToInstallaton(installationId, repoIds, "add-repos-failure");

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

      await Repo.removeReposFromInstallation(installationId, reposToRemove, "remove-repos-failure");

      await CommitReview.deleteCommitReviewsForRepos(
        installationId,
        reposToRemove,
        "remove-repos-delete-commit-reviews-failure"
      );

      await PullRequestReview.deletePullRequestReviewsForRepos(
        installationId,
        reposToRemove,
        "remove-repos-delete-pull-request-reviews-failure"
      );

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
        return;
      }

      const repoId: number = (pushPayload.repository as any).id
      const installationId = (pushPayload.installation as any).id;
      const repoName: string = (pushPayload.repository as any).name
      const branchName: string = (R.last(pushPayload.ref.split("/")) as any) // TODO errors?
      const { owner } = context.repo()
      const headCommitId: string = pushPayload.after

      const prNumbers = await getOpenPullRequestNumbersForBranch(context, repoName, branchName, owner)

      const settledPromises = await PromisesExtra.settleAll<void, any>(
        prNumbers.map(async (pullRequestNumber) => {
          return analyzeOldPullRequest(
            installationId, context, repoId, owner, repoName, pullRequestNumber, headCommitId
          );
        })
      );

      const failedResults = PromisesExtra.getRejectedSettlements(settledPromises);
      if (failedResults.length !== 0) { throw failedResults; }

    });
  });

}


// TODO HANDLE ERRORS
const analyzeOldPullRequest =
  async ( installationId: number
        , context: Probot.Context
        , repoId: number
        , owner: string
        , repoName: string
        , pullRequestNumber: number
        , headCommitId: string
        ) : Promise<void> => {


  const previousPullRequestReviewObject = await PullRequestReview.updateHeadCommit(
    installationId,
    repoId,
    pullRequestNumber,
    headCommitId,
    "update-pull-request-review-head-commit-failure"
  );

  // No need to trigger pipeline, already analyzing commits.
  if (PullRequestReview.isAnalyzingCommits(previousPullRequestReviewObject)) { return; }

  // Otherwise we need to save the old CommitReviewObject and trigger the analysis pipeline.
  await CommitReview.freezeCommitReviewWithFinalData(
    installationId,
    repoId,
    pullRequestNumber,
    previousPullRequestReviewObject.headCommitId,
    previousPullRequestReviewObject.headCommitApprovedTags as string[],
    previousPullRequestReviewObject.headCommitRejectedTags as string[],
    previousPullRequestReviewObject.headCommitRemainingOwnersToApproveDocs as string[],
    "freeze-commit-review-failure"
  );

  // Construct the new PRO from previous one.
  const pullRequestReviewObject: PullRequestReview.PullRequestReview =
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
  );

}


// TODO HANDLE ERRORS
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

  const pullRequestReviewObject: PullRequestReview.PullRequestReview = {
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


// TODO HANDLE ERRORS
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


// TODO HANDLE ERRORS
const getOpenPullRequests = async (context: Probot.Context, owner: string, { repoName }: RepoIdAndName) => {

  const response = await context.github.pulls.list({
    repo: repoName,
    owner,
    state: "open"
  })

  return response.data;

}


// TODO HANDLE ERRORS
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


// TODO HANDLE ERRORS
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


// TODO HANDLE ERRORS
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


// TODO HANDLE ERRORS
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
