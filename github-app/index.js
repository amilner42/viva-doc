const http = require('http');
const createHandler = require('github-webhook-handler');

const env = process.env;

const webhookHandler = createHandler({
    path: "/",
    secret: env.WEBHOOK_SECRET || "asdfghjkl"
});

http.createServer(handleRequest).listen(env.GITHUB_APP_PORT || 3002);

function handleRequest (request, response) {
  // ignore all requests that aren’t POST requests
  if (request.method !== 'POST') return response.end('ok')

  // here we pass the current request & response to the webhookHandler we created
  // on top. If the request is valid, then the "issue" above handler is called
  webhookHandler(request, response, () => response.end('ok'))
}

const fs = require('fs');
const createApp = require('github-app');

const app = createApp({
    id: env.GITHUB_APP_ID ||"23724",
    cert: fs.readFileSync('vivadoc.2019-01-19.private-key.pem')
});

// For logging errors in dev the easy way
// TODO prod handle errors better.
webhookHandler.on('error', function (err) {
  console.error('Error:', err.message)
});

webhookHandler.on('push', function (event) {
  console.log("EVENT", event);
  // if (event.payload.action === 'opened') {
  //   var installation = event.payload.installation.id;
  //   app.asInstallation(installation).then(function (github) {
  //     github.issues.createComment({
  //       owner: event.payload.repository.owner.login,
  //       repo: event.payload.repository.name,
  //       number: event.payload.issue.number,
  //       body: 'Welcome to the robot uprising.'
  //     });
  //   });
  // }
});
