// Module for gstithub app helpers

const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"

const createApp = require('github-app');
const fs = require('fs');


const app = createApp({
  id: 23724,
  cert: fs.readFileSync('vivadoc.2019-01-30.private-key.pem')
});


const putSuccessStatusOnCommit = async (installationId, owner, repoName, commitId) => {

  const github = await app.asInstallation(installationId);

  await github.repos.createStatus({
    owner,
    repo: repoName,
    sha: commitId,
    context: VIVA_DOC_STATUS_NAME,
    state: "success"
  });
}


module.exports = {
  putSuccessStatusOnCommit
}
