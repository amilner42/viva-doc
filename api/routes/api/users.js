const R = require('ramda');
const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const Github = require('github-api');
const User = mongoose.model('User');

/** Get's the basic user data for the client `Viewer.elm`. */
const getBasicUserData = async function(username, token) {
    const ghApi = new Github({ username: username, token: token });
    const userGhApi = ghApi.getUser();

    const repoResponse = await userGhApi.listRepos();
    const repos = R.map((repo) => { return repo.name }, repoResponse.data);

    return { username: username, repos: repos };
}


router.get('/github/login/fromCode', passport.authenticate('github'),
async function(req, res, next) {
    const user = req.user;
    const basicUserData = await getBasicUserData(user.username, user.accessToken);

    res.json(basicUserData);
});

router.get('/user',
async function(req, res, next){
    const user = req.user;

    // TODO
    if(!user) {
        return res.json({});
    }

    const basicUserData = await getBasicUserData(user.username, user.accessToken);
    res.json(basicUserData);
});

router.get('/user/logout',
async function(req, res, next) {
    req.session.destroy(function(err) {
        // TODO
        if(err) {
            return res.json({});
        }

        return res.json({});
    });
});

module.exports = router;
