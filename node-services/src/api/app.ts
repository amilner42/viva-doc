import express, { ErrorRequestHandler } from "express";
import expressSession from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import passport from "passport";
const errorhandler = require("errorhandler");

import * as config from "./config";

const mongoose = require("mongoose");
import * as MongoHelpers from "../mongo-helpers";
require("../models/loader");
MongoHelpers.connectMongoose(mongoose, config.mongoDbUri);

const MongoStore = require('connect-mongo')(expressSession);

import ApiRoutes from "./routes";
import * as AppError from "../app-error";
import * as ClientErrors from "./client-errors";
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

// Set debug settings for dev mode.
if (!isProduction) {
  app.use(errorhandler());
  mongoose.set('debug', true);
}

require('./config/passport');

app.use(ApiRoutes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  return next(ClientErrors.invalidRoute(req.route));
});

const handleErrors: ErrorRequestHandler = async (err, req, res, next) => {

  const maybeClientError = ClientErrors.extractClientError(err);

  if (maybeClientError !== null) {
    return res.status(maybeClientError.httpCode).json(maybeClientError);
  }

  AppError.logErrors(err, "api", null);
  return res.status(500).json(ClientErrors.internalServerError);
}

app.use(handleErrors);

// finally, let's start our server...
var server = app.listen(config.port, function() {
  console.log(`Listening on: ${JSON.stringify(server.address())}`);
});