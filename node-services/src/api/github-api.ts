// Module for github api helpers

import * as R from "ramda";
const Github = require('github-api'); // no types


export interface BasicUserData {
    username: string;
    repos: BasicRepoInfo[];
}


export interface BasicRepoInfo {
    id: string;
    full_name: string;
    private: boolean
}


/** Get's the basic user data for the client `Viewer.elm`. */
export const getBasicUserData = async (username: string, token: string): Promise<BasicUserData> => {
    const ghApi = new Github({ username: username, token: token });
    const userGhApi = ghApi.getUser();

    const repoResponse = await userGhApi.listRepos();

    const repos: BasicRepoInfo[] =
        R.map<any, BasicRepoInfo[]>(R.pickAll(["id", "full_name", "private"]), repoResponse.data);

    return { username: username, repos: repos };
}


// TODO MOVE
// Check if a list of repos contain a repo with a specific ID.
export const hasAccessToRepo = (repos: BasicRepoInfo[], repoId: string | number): boolean => {
    if (typeof repoId === "string") {
        repoId = parseInt(repoId)
    }

    return R.any(({ id }) => { return id === repoId; }, repos);
}
