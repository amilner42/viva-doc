import * as F from "./functional";
import * as Log from "./log";

import mongoose from "mongoose"
import { LoggableError } from "./models/LoggableError";
const LoggableErrorModel = mongoose.model("LoggableError");


// The base error type for all errors thrown within github-app.
export interface GithubAppError {
  githubAppError: true;
  errorName: string;
}


// All errors that are meant to be logged for manual review later.
//
// `isSevere` should be set to `true` if the error needs immediete attention
//    - for instance if the error is blocking the app from working
export interface GithubAppLoggableError extends GithubAppError {
  loggable: true;
  isSevere: boolean;
  installationId: number;
  data: any;
  stack: string;
}


// For recording error information.
// If error bubbled up to webhook then attach webhook name for better logging.
//
// @THROWS never.
export const logErrors = async (err: any, webhookName: F.Maybe<string>): Promise<void> => {

  if (Array.isArray(err)) {

    await Promise.all(
      err.map(async (errItem) => {
        return await logErrors(errItem, webhookName);
      })
    );

    return;
  }

  const githubAppLoggableError = isGithubAppLoggableError(err);

  if (githubAppLoggableError !== null) {
    await logLoggableError(githubAppLoggableError);
    return;
  }

  logUnexpectedError(err, webhookName);
}


// A wrapper for all webhooks.
//
// Will catch and log loggable errors properly. That is the point of this wrapper. It will handle both single errors
// and nested arrays of errors properly.
//
// NOTE: All other errors will be caught but will be logged as unexpected errors and will not be saved to the db.
export const webhookErrorWrapper =
  async ( webhookName: string
        , webhookCode: () => Promise<void>
        ): Promise<void> => {

  try {
    await webhookCode();
  } catch (err) {
    await logErrors(err, webhookName);
  }
}


// Log that an error not meant for logging has occured.
//
// @THROWS never.
const logUnexpectedError = (err: any, webhookName: F.Maybe<string>): void => {

  if (webhookName !== null) {
    Log.error(`An unexpected error leaked all the way back to webhook: ${webhookName}.`);
  } else {
    Log.error(`An unexpected error occured.`);
  }

  doIgnoringError(() => { Log.error(`  Error object: ${err}`); });
  doIgnoringError(() => { Log.error(`  Error object JSON.stringify: ${JSON.stringify(err)}`); });
}


// Logs the loggable error and then saves it to the database.
//
// @THROWS never.
const logLoggableError = async (err: GithubAppLoggableError): Promise<void> => {

  Log.error(`A loggable error occured for installation ${err.installationId} with name: ${err.errorName}`);
  doIgnoringError(() => { Log.error(`  Loggable error is severe: ${err.isSevere}`); });
  doIgnoringError(() => { Log.error(`  Loggable error contains data: ${JSON.stringify(err.data)}`); });
  doIgnoringError(() => { Log.error(`  Loggable error contains stack: ${err.stack}`); });

  const loggableErrorObject: LoggableError = {
    name: err.errorName,
    isSevere: err.isSevere,
    data: err.data,
    stack: err.stack,
    installationId: err.installationId
  }

  try {
    const loggableError = new LoggableErrorModel(loggableErrorObject);
    await loggableError.save();
    Log.error(`  Saved loggable error to database`);
  } catch (err) {
    Log.error(`  Could not save loggable error to database`);
  }
}


// Returns the stack string if it exists, otherwise returns "no stack available.".
export const getStack = (): string => {

  const stack = new Error().stack;

  if (stack === undefined) {
    return "No stack available";
  }

  return stack;
}


// @THROWS never.
export const isGithubAppLoggableError = (err: any): F.Maybe<GithubAppLoggableError>  => {

  if (typeof err !== "object") {
    return null;
  }

  if ((err as GithubAppLoggableError).githubAppError && (err as GithubAppLoggableError).loggable) {
    return err;
  }

  return null;
}


// @THROWS never.
const doIgnoringError = (doThis: () => void): void => {
  try { doThis(); } catch (err) { }
}
