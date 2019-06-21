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

 @VD amilner42 file
*/


const env = process.env;
const isProduction = env.NODE_ENV === 'production';

// Check prod env variables.
if ( isProduction ) {

  if ( env.VD_WEB_CLIENT_ORIGIN === undefined
        || env.VD_MONGODB_URI === undefined
        || env.VD_PORT === undefined
        || env.VD_COOKIE_SECRET === undefined ) {

    throw "You have undefined production environment variables!";
  }
}

// Check always required variables.
if ( env.VD_GITHUB_CLIENT_SECRET === undefined || env.VD_GITHUB_CLIENT_ID === undefined) {
  throw "You have undefined environment variables that are required in dev/prod";
}


const webClientOrigin = isProduction ? env.VD_WEB_CLIENT_ORIGIN : "http://localhost:8080";
const githubCallbackUrl = `${webClientOrigin}/oauth_redirect`


module.exports = {
  isProduction,
  githubClientSecret: env.VD_GITHUB_CLIENT_SECRET,
  githubClientId: env.VD_GITHUB_CLIENT_ID,
  githubCallbackUrl,
  mongoDbUri: isProduction ? env.VD_MONGODB_URI : 'mongodb://localhost/viva-doc-dev',
  port: isProduction ? env.VD_PORT : 3001,
  sessionSecret: isProduction ? env.VD_COOKIE_SECRET : 'dev-secret-123',
  webClientOrigin
};
