import { Application } from 'probot' // eslint-disable-line no-unused-vars
import * as R from "ramda"

export = (app: Application) => {

  // On installation going to set the default branch to be protected.
  // @PROD This will not be the solution in production, but rather probably refer to the config file to figure out which
  // branches they'd like to integrate with VD.
  app.on('installation.created', async (context) => {
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
              contexts: [ "continuous-documentation/viva-doc" ]
            },
            enforce_admins: true,
            required_pull_request_reviews: null,
            restrictions: null
          })
        }
      }, branches)
    }), repos)
  })
}
