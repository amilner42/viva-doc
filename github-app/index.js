const http = require('http');
const createHandler = require('github-webhook-handler');

const env = process.env;

const webhookHandler = createHandler({
    path: "/",
    secret: env.WEBHOOK_SECRET || "dev-secret"
});

http.createServer(handleRequest).listen(env.GITHUB_APP_PORT || 3333);

webHookHandler.on('issues', (event) => {
  console.log(`Received issue event for "${event.payload.issue.title}"`)
})

function handleRequest (request, response) {
  // ignore all requests that aren’t POST requests
  if (request.method !== 'POST') return response.end('ok')

  // here we pass the current request & response to the webHookHandler we created
  // on top. If the request is valid, then the "issue" above handler is called
  webHookHandler(request, response, () => response.end('ok'))
}

//
// const fs = require('fs');
// const createApp = require('github-app');
//
// const app = createApp({
//     id: env.GITHUB_APP_ID ||"23724",
//     cert: fs.readFileSync('vivadoc.2019-01-19.private-key.pem')
// });
//
// // TODO do I want this?
// handler.on('error', function (err) {
//   console.error('Error:', err.message)
// });
//
// handler.on('issues', function (event) {
//   console.log("EVENT", event);
//   if (event.payload.action === 'opened') {
//     var installation = event.payload.installation.id;
//     app.asInstallation(installation).then(function (github) {
//       github.issues.createComment({
//         owner: event.payload.repository.owner.login,
//         repo: event.payload.repository.name,
//         number: event.payload.issue.number,
//         body: 'Welcome to the robot uprising.'
//       });
//     });
//   }
// });
`
