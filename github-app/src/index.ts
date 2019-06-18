// Base module for probot app.

// WARNING: Do not import internal modules here, import them below.
import * as Probot from 'probot' // eslint-disable-line no-unused-vars
import R from "ramda"
import mongoose = require("mongoose")


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
import * as GH from "./github-helpers";


export = (app: Probot.Application) => {


  app.on("installation.created", async (context) => {
    AppError.webhookErrorWrapper("installation.created", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id
      const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

      const repoIdsAndNames: GH.RepoIdAndName[] = R.map((repo) => {
        return { repoName: repo.name, repoId: repo.id };
      }, payload.repositories);

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

      await Repo.newInstallation(installationId, owner, repoIds, "init-repo-failure");

      await analyzeAlreadyOpenPrsForRepos(installationId, context, owner, repoIdsAndNames);

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

      const repoIdsAndNames: GH.RepoIdAndName[] = R.map((repoAdded) => {
        return { repoName: repoAdded.name, repoId: repoAdded.id };
      }, payload.repositories_added)

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

      await Repo.addReposToInstallaton(installationId, repoIds, "add-repos-failure");

      await analyzeAlreadyOpenPrsForRepos(installationId, context, owner, repoIdsAndNames);

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
      const installationId = (prPayload.installation as any).id
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
        installationId,
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

      const prNumbers = await GH.getOpenPullRequestNumbersForBranch(installationId, context, repoName, branchName, owner)

      const settledPromises = await PromisesExtra.settleAll<void, any>(
        prNumbers.map(async (pullRequestNumber) => {
          return analyzeOldPullRequest(
            installationId, context, repoId, owner, repoName, pullRequestNumber, headCommitId
          );
        })
      );

      const rejectedSettlements = PromisesExtra.getRejectedSettlements(settledPromises);
      if (rejectedSettlements.length > 0) { throw rejectedSettlements; }

    });
  });

}


// @THROWS either:
//  - single `GithubAppLoggableError`
//  - array of `GithubAppLoggableError`
//  - unknown leaked errors?
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

  // No need to trigger pipeline if already analyzing commits.
  if (PullRequestReview.isAnalyzingCommits(previousPullRequestReviewObject)) { return; }

  try {

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

  } catch (freezeCommitError) {

    try {

      await PullRequestReview.clearPendingCommitOnAnalysisFailure(
        installationId,
        repoId,
        pullRequestNumber,
        headCommitId
      );

    } catch (clearPendingCommitOnAnalysisFailureError) {

      throw [ clearPendingCommitOnAnalysisFailureError, freezeCommitError ];
    }

    throw freezeCommitError;
  }

  const pullRequestReviewObject: PullRequestReview.PullRequestReview =
    PullRequestReview.newLoadingPullRequestReviewFromPrevious(
      previousPullRequestReviewObject,
      headCommitId,
      [ headCommitId ]
    );

  await Analysis.pipeline(
    pullRequestReviewObject,
    getClientUrlForCommitReview(repoId, pullRequestNumber),
    GH.retrieveDiff(installationId, context, owner, repoName),
    GH.retrieveFile(installationId, context, owner, repoName),
    GH.setCommitStatus(installationId, context, owner, repoName)
  );

}


// TODO HANDLE ERRORS
const analyzeNewPullRequest =
  async ( installationId: number
  , context: Probot.Context
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
    GH.retrieveDiff(installationId, context, owner, repoName),
    GH.retrieveFile(installationId, context, owner, repoName),
    GH.setCommitStatus(installationId, context, owner, repoName)
  ).catch((err) => {
    console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
  })

  return;
}


// @THROWS An array of errors, propogated from all the calls to `analyzeAlreadyOpenPrs`.
const analyzeAlreadyOpenPrsForRepos =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoIdsAndNames: GH.RepoIdAndName[]
        ): Promise<void> => {

  const settledPromises = await PromisesExtra.settleAll(
    repoIdsAndNames.map(async (repoIdAndName) => {
      return await analyzeAlreadyOpenPrs(installationId, context, owner, repoIdAndName);
    })
  );

  const rejectedSettlements = PromisesExtra.getRejectedSettlements(settledPromises);
  if (rejectedSettlements.length > 0) { throw rejectedSettlements; }
}


// @THROWS either:
//   - GithubApp.LoggableError
//   - An array of errors, propogated by calls to `analyzeNewPullRequest`.
const analyzeAlreadyOpenPrs =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoIdAndName: GH.RepoIdAndName
        ): Promise<void> => {

  const openPrs = await GH.getOpenPullRequests(installationId, context, owner, repoIdAndName);

  const settledPromises = await PromisesExtra.settleAll(
    openPrs.map(async (openPr) => {

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
        installationId,
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

    })
  );

  const rejectedSettlements = PromisesExtra.getRejectedSettlements(settledPromises);
  if (rejectedSettlements.length > 0) { throw rejectedSettlements; }

}


// @THROWS never.
// TODO add env for prod.
const getClientUrlForCommitReview = R.curry((repoId: number, prNumber: number, commitId: string): string => {
  return `http://localhost:8080/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
})
