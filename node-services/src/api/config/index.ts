/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

 Env variables to set:

 [ prod ] env.NODE_ENV = 'production'
 [ prod ] env.VD_WEB_CLIENT_ORIGIN
 [ prod ] env.VD_MONGODB_URI
 [ prod ] env.VD_PORT
 [ prod ] env.VD_COOKIE_SECRET

 [ always ] env.VD_GITHUB_CLIENT_SECRET
 [ always ] env.VD_GITHUB_CLIENT_ID
 [ always ] env.PRIVATE_KEY_PATH
 [ always ] env.APP_ID

 @VD amilner42 file
*/

const env = process.env;
export const isProduction = env.NODE_ENV === 'production';


let githubClientSecret: string;
let githubClientId: string;
let githubAppCertPath: string;
let githubAppId: string;

let webClientOrigin : string;
let mongoDbUri : string;
let port : number;
let sessionSecret : string;


// Check always required variables.
if ( env.VD_GITHUB_CLIENT_SECRET === undefined
      || env.VD_GITHUB_CLIENT_ID === undefined
      || env.PRIVATE_KEY_PATH === undefined
      || env.APP_ID === undefined ) {
  throw "You have undefined environment variables that are required in dev/prod";
}
githubClientSecret = env.VD_GITHUB_CLIENT_SECRET;
githubClientId = env.VD_GITHUB_CLIENT_ID;
githubAppCertPath = env.PRIVATE_KEY_PATH;
githubAppId = env.APP_ID;


if ( isProduction ) {

  if ( env.VD_WEB_CLIENT_ORIGIN === undefined
        || env.VD_MONGODB_URI === undefined
        || env.VD_PORT === undefined
        || env.VD_COOKIE_SECRET === undefined ) {

    throw "You have undefined production environment variables!";
  }

  const portAsInt = parseInt(env.VD_PORT, 10);

  if (portAsInt === NaN) {
    throw `Port must be an int: ${env.VD_PORT}`;
  }

  webClientOrigin = env.VD_WEB_CLIENT_ORIGIN;
  mongoDbUri =  env.VD_MONGODB_URI;
  port = portAsInt;
  sessionSecret = env.VD_COOKIE_SECRET;

} else {
  // Dev mode
  webClientOrigin = "http://localhost:8080";
  mongoDbUri = "mongodb://localhost/viva-doc-dev";
  port = 3001;
  sessionSecret = "dev-secret-123";
}


const githubCallbackUrl = `${webClientOrigin}/oauth_redirect`;


export {
  githubClientSecret,
  githubClientId,
  githubAppCertPath,
  githubAppId,
  webClientOrigin,
  mongoDbUri,
  port,
  sessionSecret,
  githubCallbackUrl
};
