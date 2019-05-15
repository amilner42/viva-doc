const router = require('express').Router();
const passport = require('passport');
const github = require("../../github");


router.get('/github/login/fromCode', passport.authenticate('github'),
async function(req, res, next) {
    const user = req.user;
    const basicUserData = await github.getBasicUserData(user.username, user.accessToken);

    res.json(basicUserData);
});

router.get('/user',
async function(req, res, next){
    const user = req.user;

    // TODO
    if(!user) {
        return res.json({});
    }

    const basicUserData = await github.getBasicUserData(user.username, user.accessToken);
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
