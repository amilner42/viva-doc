// The base error type for all errors thrown within github-app.
export interface GithubAppError {
  githubAppError: true;
  errorName: string;
}


// Log that an error leaked all the way to the webhook.
//
// We don't want these type of errors.
export const logWebhookErrorLeak = (webhookName: string, err: any): void => {

  log(`An unhandled error leaked all the way back to webhook ${webhookName}.`);
  doIgnoringError(() => { log(`Error object direct log: ${err}`); });
  doIgnoringError(() => { log(`Error object JSON.stringify: ${JSON.stringify(err)}`)});

}


// Stub for possible logging service.
export const log = (str: string) => {
  console.error(str);
}


// Do something and eat any errors that get thrown.
const doIgnoringError = (doThis: () => void): void => {
  try { doThis(); } catch (err) { }
}
