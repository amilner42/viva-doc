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


// A wrapper for all webhooks.
//
// Will catch and log loggable errors properly. That is the point of this wrapper. It will handle both single errors
// and arrays of errors properly.
//
// NOTE: All other errors will be caught but will be logged as leaked errors.
export const webhookErrorWrapper = async (webhookName: string, webhookCode: () => Promise<void>): Promise<void> => {

  // This function will always resolve.
  const handleSingleError = async (err: any): Promise<void> => {

    const githubAppLoggableError = isGithubAppLoggableError(err);

    if (githubAppLoggableError !== null) {
      await logLoggableError(githubAppLoggableError);
      return;
    }

    logWebhookErrorLeak(webhookName, err);
  }

  // This function will always resolve.
  const handleError = async (err: any): Promise<void> => {

    if (Array.isArray(err)) {
      await Promise.all(err.map(handleError));
    } else {
      await handleSingleError(err);
    }

  }

  try {
    await webhookCode();
  } catch (err) {
    await handleError(err);
  }

}


// Log that an error leaked all the way to the webhook (not good).
//
// NOTE: This function will not throw any errors.
export const logWebhookErrorLeak = (webhookName: string, err: any): void => {

  Log.error(`An unhandled error leaked all the way back to webhook ${webhookName}.`);
  doIgnoringError(() => { Log.error(`  Error object direct log: ${err}`); });
  doIgnoringError(() => { Log.error(`  Error object JSON.stringify: ${JSON.stringify(err)}`); });
}


// Logs the loggable error and then saves it to the database.
//
// NOTE: This function will not throw any errors.
export const logLoggableError = async (err: GithubAppLoggableError): Promise<void> => {

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


// This function will not throw errors.
export const isGithubAppLoggableError = (err: any): F.Maybe<GithubAppLoggableError>  => {

  if (typeof err !== "object") {
    return null;
  }

  if ((err as GithubAppLoggableError).githubAppError && (err as GithubAppLoggableError).loggable) {
    return err;
  }

  return null;
}


// Do something and eat any errors that get thrown.
const doIgnoringError = (doThis: () => void): void => {
  try { doThis(); } catch (err) { }
}
