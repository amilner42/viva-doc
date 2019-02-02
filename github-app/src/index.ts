// Base module containing probot app

import { Application } from 'probot' // eslint-disable-line no-unused-vars
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
    const pushPayload = context.payload
    const commits = pushPayload.commits
    const { owner, repo } = context.repo()

    for (let commit of commits) {
      const currentCommitId = commit.id

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
        // Need the correct accept header to get the diff:
        // Refer: https://developer.github.com/v3/media/#commits-commit-comparison-and-pull-requests
        const diffAcceptHeader = { accept: "application/vnd.github.v3.diff"}
        // Unfortunetly the typings are wrong, and they don't include `headers` even though octokit (which this wraps)
        // has that field, and of course we need to pass the correct header to get the correct media type. This is
        // why I have a `as any` at the end here, it is only because the typings are wrong.
        return context.github.repos.getCommit({
          headers: diffAcceptHeader,
          owner,
          repo,
          sha: currentCommitId
        } as any).then(R.path(["data"]))
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
