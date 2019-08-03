// Module for github api helpers

import * as R from "ramda";
const Github = require('github-api'); // no types
import * as Installation from "../models/Installation";


export interface BasicUserData {
    username: string;
    repos: BasicRepoInfo[];
}


export interface BasicRepoInfo {
    id: string;
    full_name: string;
    private: boolean
    appInstalled: boolean;
}


/** Get's the basic user data for the client `Viewer.elm`. */
export const getBasicUserData = async (username: string, token: string): Promise<BasicUserData> => {
    const ghApi = new Github({ username: username, token: token });
    const userGhApi = ghApi.getUser();

    const repoResponseData: { id: string, full_name: string, private: boolean }[] = (await userGhApi.listRepos()).data;

    const installedRepoMap = await Installation.getInstalledRepoMap(repoResponseData.map((repo) => repo.id));

    const repos: BasicRepoInfo[] =
        R.map((repo) => {
            return {
                id: repo.id,
                full_name: repo.full_name,
                private: repo.private,
                appInstalled: installedRepoMap[repo.id] === true
            };
        }, repoResponseData);

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
