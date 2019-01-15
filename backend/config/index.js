/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.
*/

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

// TODO Make sure all of these are good for production
module.exports = {
  isProduction: isProduction,
  githubClientSecret: "f514f3d3cf098bd0a7f4a06409ceb183ddc5cd2c",
  githubClientId: "d887c8b5dea7b99a76af",
  githubCallbackUrl: "http://viva-doc.s3-website-us-west-2.amazonaws.com/oauth_redirect",
  mongoDbUri: isProduction ? env.MONGODB_URI : 'mongodb://localhost/viva-doc-dev',
  port: isProduction ? env.port : 3001,
  sessionSecret: isProduction ? env.COOKIE_SECRET : 'dev-secret-123',
  webClientOrigin: isProduction ? env.WEB_CLIENT_ORIGIN : 'http://viva-doc.s3-website-us-west-2.amazonaws.com'
};
