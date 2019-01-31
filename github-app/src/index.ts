// Base module containing probot app

import { Application } from 'probot' // eslint-disable-line no-unused-vars
import { WebhookPayloadPush } from '@octokit/webhooks'
import R from "ramda"

import { analyzeCommitDiffAndSubmitStatus } from "./analysis/index"

const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"
const VIVA_DOC_STATUS_CONTEXT = "Documentation Analysis";

export = (app: Application) => {

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
    const pushPayload: WebhookPayloadPush = context.payload
    const commits = pushPayload.commits
    const baseCommit = pushPayload.before
    const { owner, repo } = context.repo()

    for (let i = 0; i < commits.length; i++) {
      const previousCommitId = i === 0 ? baseCommit : commits[i - 1].id
      const currentCommitId = commits[i].id

      // First: set status to pending for each commit
      context.github.repos.createStatus({
        owner,
        repo,
        sha: currentCommitId,
        state: "pending",
        context: VIVA_DOC_STATUS_CONTEXT
      });

      // Second: run analysis
      const retrieveDiff = async (): Promise<any> => {
        return context.github.repos.compareCommits({
          base: previousCommitId,
          head: currentCommitId,
          owner,
          repo
        }).then(R.path(["data"]))
      }

      const retrieveFile = async (path: string): Promise<any> => {
        return context.github.repos.getContents({
          owner,
          repo,
          path
        }).then(R.path(["data"]))
      }

      const setStatus = async (statusState: "success" | "failure") => {
        return context.github.repos.createStatus({
          owner,
          repo,
          sha: currentCommitId,
          context: VIVA_DOC_STATUS_CONTEXT,
          state: statusState
        }).then(R.path(["data"]))
      }

      analyzeCommitDiffAndSubmitStatus(
        retrieveDiff,
        retrieveFile,
        setStatus
      )
    }
  })

}
