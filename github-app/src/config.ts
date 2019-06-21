/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

  Env variables to set:

  [ prod ] env.NODE_ENV = 'production'
  [ prod ] env.VD_WEB_CLIENT_ORIGIN
  [ prod ] env.VD_MONGODB_URI

  @VD amilner42 file
*/


const env = process.env;
const isProduction = env.NODE_ENV === 'production';

let webClientOrigin: string;
let mongoDbUri: string;

if ( isProduction ) {

  if (env.VD_WEB_CLIENT_ORIGIN === undefined || env.VD_MONGODB_URI === undefined) {
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
