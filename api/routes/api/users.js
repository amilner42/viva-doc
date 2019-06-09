const router = require('express').Router();
const passport = require('passport');
const githubApi = require("../../github-api");
const errors = require("../errors");


router.get('/github/login/fromCode', passport.authenticate('github'),
async function(req, res, next) {
    const user = req.user;
    const basicUserData = await githubApi.getBasicUserData(user.username, user.accessToken);

    res.json(basicUserData);
});


router.get('/user',
async function(req, res, next){
    const user = req.user;

    if(!user) { return res.status(401).send(errors.notLoggedInError); }

    const basicUserData = await githubApi.getBasicUserData(user.username, user.accessToken);
    res.json(basicUserData);
});


router.get('/user/logout',
async function(req, res, next) {
    req.session.destroy(function(err) {

        if (err) { return res.status(500).send(errors.internalServerError); }

        return res.json({});
    });
});


module.exports = router;
