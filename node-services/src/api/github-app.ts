// Module for github app helpers

const createApp = require('github-app'); // no types
import fs from 'fs';
import * as config from './config';


const VIVA_DOC_STATUS_NAME = "continuous-documentation/viva-doc"


// TODO cert location should be a config variable, not direct.
const app = createApp({
  id: 23724,
  cert: fs.readFileSync('vivadoc.2019-01-30.private-key.pem')
});


export const putSuccessStatusOnCommit =
  async ( installationId: number
        , owner: string
        , repoName: string
        , repoId: number
        , prNumber: number
        , commitId: string ): Promise<void> => {

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


export interface BasicPullRequestInfo {
  number: number;
  title: string;
  headCommitId: string;
  htmlUrl: string;
}


export const getOpenPullRequests =
  async ( installationId: number
        , owner: string
        , repoName: string
      ) : Promise<BasicPullRequestInfo[]> => {

  const github = await app.asInstallation(installationId);

  const pullsResponse = await github.pullRequests.list({
    owner,
    repo: repoName,
    state: "open"
  });

  return pullsResponse.data.map((pull: any) => {
    const basicPullRequestInfo: BasicPullRequestInfo = {
      number: pull.number,
      title: pull.title,
      headCommitId: pull.head.sha,
      htmlUrl: pull.html_url
    };

    return basicPullRequestInfo;
  });

}
