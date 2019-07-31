import Express from "express";
import Passport from "passport";
import * as Errors from "../errors";
import * as GithubApi from"../../github-api";


const expressRouter = Express.Router();


expressRouter.get('/github/login/fromCode', Passport.authenticate('github'),
async function(req, res, next) {
    const user = req.user;
    const basicUserData = await GithubApi.getBasicUserData(user.username, user.accessToken);

    res.json(basicUserData);
});


expressRouter.get('/user',
async function(req, res, next){
    const user = req.user;

    if(!user) { return res.status(401).send(Errors.notLoggedInError); }

    const basicUserData = await GithubApi.getBasicUserData(user.username, user.accessToken);
    return res.json(basicUserData);
});


expressRouter.get('/user/logout',
function(req, res, next) {

    if (!req.session) { return res.json({}); }

    return req.session.destroy(function(err) {

        if (err) { return res.status(500).send(Errors.internalServerError); }

        return res.json({});
    });
});


export = expressRouter;
