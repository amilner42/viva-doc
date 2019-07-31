import express, { ErrorRequestHandler } from "express";
import expressSession from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import passport from "passport";
const errorhandler = require("errorhandler");
const mongoose = require("mongoose");
// NOTE: We have to load these and order of these requires matters, LogError must be first.
// @VD amilner42 block
require("../models/LogError");
require("../models/CommitReview");
require("../models/PullRequestReview");
require("../models/Repo");
require("../models/User");
// @VD end-block
const MongoStore = require('connect-mongo')(expressSession);

import ApiRoutes from "./routes";
import * as config from "./config";
import * as AppError from "../app-error";
import * as Errors from "./routes/errors";
const isProduction = config.isProduction;


// Create global app object
var app = express();

app.use(cors({ credentials: true, origin: config.webClientOrigin }));

// Normal express config defaults
app.use(require('morgan')('dev'));
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressSession({
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({url: config.mongoDbUri})
}));
app.use(require('method-override')());

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(config.mongoDbUri);

// Set debug settings for dev mode.
if (!isProduction) {
  app.use(errorhandler());
  mongoose.set('debug', true);
}

require('./config/passport');

app.use(ApiRoutes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next({ errorCode: 404, message: "not found" });
});

/// error handler

const handleErrors: ErrorRequestHandler = async (err, req, res, next) => {
  await AppError.logErrors(err, "api", null);
  return res.status(500).json(Errors.internalServerError);
}

// production error handler
app.use(handleErrors);

// finally, let's start our server...
var server = app.listen(config.port, function() {
  console.log(`Listening on: ${JSON.stringify(server.address())}`);
});
