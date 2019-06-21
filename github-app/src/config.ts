/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

  Env variables to set:

  [ prod ] env.NODE_ENV = 'production'
  [ prod ] env.VD_WEB_CLIENT_ORIGIN
  [ prod ] env.VD_MONGODB_URI

There are also environment variables used by probot that must be set. It does not work to pass these as flags to probot,
it appears that in production it wants them as enviornment variables.

  [ probot prod ] env.APP_ID
  [ probot prod ] env.PRIVATE_KEY_PATH
  [ probot prod ] env.WEBHOOK_SECRET

  @VD amilner42 file
*/


const env = process.env;
const isProduction = env.NODE_ENV === 'production';

let webClientOrigin: string;
let mongoDbUri: string;

if ( isProduction ) {

  if (env.VD_WEB_CLIENT_ORIGIN === undefined
      || env.VD_MONGODB_URI === undefined
      || env.APP_ID === undefined
      || env.PRIVATE_KEY_PATH === undefined
      || env.WEBHOOK_SECRET === undefined ) {
    throw "You have undefined production environement variables."
  }

  webClientOrigin = env.VD_WEB_CLIENT_ORIGIN;
  mongoDbUri = env.VD_MONGODB_URI;

} else {
  webClientOrigin = "http://localhost:8080";
  mongoDbUri = "mongodb://localhost/viva-doc-dev";
}


export const config = {
  isProduction,
  webClientOrigin,
  mongoDbUri
}
