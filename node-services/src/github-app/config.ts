/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

  Env variables to set:

  [ always ] env.APP_ID
  [ always ] env.WEBHOOK_SECRET

  [ dev ] env.LOG_LEVEL
  [ dev ] env.WEBHOOK_PROXY_URL

  [ prod ] env.NODE_ENV = 'production'
  [ prod ] env.PRIVATE_KEY_PATH
  [ prod ] env.VD_WEB_CLIENT_ORIGIN
  [ prod ] env.VD_MONGODB_URI

  @VD amilner42 file
*/


const env = process.env;
const isProduction = env.NODE_ENV === 'production';

let webClientOrigin: string;
let mongoDbUri: string;


// Variables required in both dev/prod.
if ( env.APP_ID === undefined || env.WEBHOOK_SECRET === undefined ) {
  throw "You have undefined env variables required in both dev/prod";
}


// Variables required by probot only in dev
if ( !isProduction ) {

  //  Use `trace` to get verbose logging or `info` to show less
  if ( env.LOG_LEVEL === undefined || env.WEBHOOK_PROXY_URL === undefined ) {
    throw "You have undefined env variables required in dev";
  }
}


// Variables required only in prod.
if ( isProduction ) {

  if (env.VD_WEB_CLIENT_ORIGIN === undefined
      || env.VD_MONGODB_URI === undefined
      || env.PRIVATE_KEY_PATH === undefined ) {
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
