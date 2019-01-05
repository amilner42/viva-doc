const R = require('ramda');
const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const Github = require('github-api')
const User = mongoose.model('User');


router.get('/github/login/fromCode', passport.authenticate('github'),
async function(req, res, next){
    const user = req.user;
    const ghApi = new Github({ username: user.username, token: user.accessToken });
    const userGhApi = ghApi.getUser();

    let repoResponse;

    try {
        repoResponse = await userGhApi.listRepos();
    } catch (err) {
        // TODO send err to client
        console.log(err);
    }
    const repos = R.map((repo) => { return repo.name }, repoResponse.data);
    res.json({ username: user.username, repos: repos });
});

router.get('/user', require('connect-ensure-login').ensureLoggedIn(),
async function(req, res, next){
    console.log("User is logged in?", req.user.username);
});

module.exports = router;
