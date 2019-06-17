import * as F from "./functional";

import mongoose from "mongoose"
import { SevereError } from "./models/SevereError";
const SevereErrorModel = mongoose.model("SevereError");


// The base error type for all errors thrown within github-app.
export interface GithubAppError {
  githubAppError: true;
  errorName: string;
}


// A severe error is an error that couldn't be handled that requires attention asap.
export interface GithubAppSevereError extends GithubAppError {
  severe: true;
  installationId: number;
  data: any;
  stack: string;
}


// A wrapper for all webhooks.
//
// Will catch and handle severe errors properly. All other errors will be logged but cannot be dealt with in a
// meaningful way at this level - they should be dealt with earlier.
export const webhookErrorWrapper = async (webhookName: string, webhookCode: () => Promise<void>): Promise<void> => {
  try {

    await webhookCode();

  } catch (err) {

    const githubAppSevereError = isGithubAppSevereError(err);

    if (githubAppSevereError !== null) {
      await recordSevereError(githubAppSevereError);
      return;
    }

    logWebhookErrorLeak(webhookName, err);
  }
}


// Log that an error leaked all the way to the webhook (not good).
//
// NOTE: This function will not throw any errors.
export const logWebhookErrorLeak = (webhookName: string, err: any): void => {

  log(`An unhandled error leaked all the way back to webhook ${webhookName}.`);
  doIgnoringError(() => { log(`  Error object direct log: ${err}`); });
  doIgnoringError(() => { log(`  Error object JSON.stringify: ${JSON.stringify(err)}`); });
}


// Logs the severe error and then saves it to the database.
//
// NOTE: This function will not throw any errors.
export const recordSevereError = async (err: GithubAppSevereError): Promise<void> => {

  log(`A severe error occured for installation ${err.installationId} with name: ${err.errorName}`);
  doIgnoringError(() => { log(`  Severe error contains data: ${JSON.stringify(err.data)}`); });
  doIgnoringError(() => { log(`  Severe error contains stack: ${err.stack}`)});

  const severeErrorObject: SevereError = {
    name: err.errorName,
    data: err.data,
    stack: err.stack,
    installationId: err.installationId
  }

  try {
    const severeError = new SevereErrorModel(severeErrorObject);
    await severeError.save();
    log(`  Saved severe error to database`);
  } catch (err) {
    log(`  Could not save severe error to database`);
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


export const isGithubAppSevereError = (err: any): F.Maybe<GithubAppSevereError>  => {
  if (err.githubAppError && err.severe) {
    return err;
  }

  return null;
}


// Stub for possible logging service.
export const log = (str: string) => {
  console.error(str);
}


// Do something and eat any errors that get thrown.
const doIgnoringError = (doThis: () => void): void => {
  try { doThis(); } catch (err) { }
}
