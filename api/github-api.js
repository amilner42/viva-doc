// Module for github api helpers

const R = require('ramda');
const Github = require('github-api');


/** Get's the basic user data for the client `Viewer.elm`. */
const getBasicUserData = async function(username, token) {
    const ghApi = new Github({ username: username, token: token });
    const userGhApi = ghApi.getUser();

    const repoResponse = await userGhApi.listRepos();

    const repos = R.map(R.pickAll(["id", "full_name", "private"]), repoResponse.data);

    return { username: username, repos: repos };
}

// TODO Move `hasAccessToRepos` and `isOwnerOfTag` functions elsewhere

/** Check if a list of repos contain a repo with a specific ID.

    repoId can be a string or an int
*/
const hasAccessToRepo = (repos, repoId) => {
    if (typeof repoId === "string") {
        repoId = parseInt(repoId)
    }

    return R.any(R.pipe(R.path(["id"]), R.equals(repoId)), repos)
}

const isOwnerOfTag = (branchReview, tagId, username) => {

    const ownsTag = R.curry((tagId, username, tag) => {
        return (tag.tagId.equals(tagId)) && (username === tag.owner)
    });

    return R.any((fileReview) => {
        switch (fileReview.fileReviewType) {

            case "modified-file":
            case "renamed-file":
                const tags = R.map(R.path(["tag"]), fileReview.reviews)
                return R.any(ownsTag(tagId, username), tags)

            case "deleted-file":
            case "new-file":
                return R.any(ownsTag(tagId, username), fileReview.tags)

        }
    }, branchReview.fileReviews);
}

module.exports = {
    getBasicUserData,
    hasAccessToRepo,
    isOwnerOfTag
}
