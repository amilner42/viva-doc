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

require("./models/BranchReview")

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
    const commits = pushPayload.commits
    const repoId: string = (pushPayload.repository as any).id
    const repoFullName: string = (pushPayload.repository as any).full_name
    const branchName: string = pushPayload.ref
    const numberOfCommits = commits.length
    const { owner, repo } = context.repo()
    const baseCommitId: string = pushPayload.before
    const finalCommitId: string = pushPayload.after

    const lastCommitId = commits[numberOfCommits - 1].id
    const previousCommitId = (numberOfCommits === 1) ? baseCommitId : commits[numberOfCommits - 2].id

    const retrieveDiff = async (): Promise<any> => {
      // Need the correct accept header to get the diff:
      // Refer: https://developer.github.com/v3/media/#commits-commit-comparison-and-pull-requests
      const diffAcceptHeader = { accept: "application/vnd.github.v3.diff"}
      // Unfortunetly the typings are wrong, and they don't include `headers` even though octokit (which this wraps)
      // has that field, and of course we need to pass the correct header to get the correct media type. This is
      // why I have a `as any` at the end here, it is only because the typings are wrong.
      // TODO: Currently assumes base branch is "master", it needs to find the branch
      return context.github.repos.compareCommits({
        headers: diffAcceptHeader,
        owner,
        repo,
        base: "master",
        head: lastCommitId
      } as any).then(R.path(["data"]))
    }

    const retrieveFiles = async (previousFilePath: string, currentFilePath: string): Promise<[string, string]> => {

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


      const previousFile = await getFile(previousCommitId, previousFilePath)
      const currentFile = await getFile(lastCommitId, currentFilePath)

      return [ previousFile, currentFile ]
    }

    const setStatus = async (statusState: "success" | "failure" | "pending", description: string) => {
      return context.github.repos.createStatus({
        owner,
        repo,
        sha: lastCommitId,
        context: VIVA_DOC_STATUS_NAME,
        state: statusState,
        description
      }).then(R.path(["data"]))
    }


    Analysis.pipeline(repoId, repoFullName, branchName, finalCommitId, retrieveDiff, retrieveFiles, setStatus)
    .catch((err) => {
      console.log(`Analysis Pipeline Error: ${err} --- ${JSON.stringify(err)}`)
    })

   })

}
