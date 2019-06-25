// Module for gstithub app helpers

const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"

const createApp = require('github-app');
const fs = require('fs');
const config = require('./config');

const app = createApp({
  id: 23724,
  cert: fs.readFileSync('vivadoc.2019-01-30.private-key.pem')
});


const putSuccessStatusOnCommit = async (installationId, owner, repoName, repoId, prNumber, commitId) => {

  const github = await app.asInstallation(installationId);

  await github.repos.createStatus({
    owner,
    repo: repoName,
    sha: commitId,
    context: VIVA_DOC_STATUS_NAME,
    state: "success",
    description: "All tags have been approved",
    target_url: `${config.webClientOrigin}/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
  });
}


module.exports = {
  putSuccessStatusOnCommit
}
