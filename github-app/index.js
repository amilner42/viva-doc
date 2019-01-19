const http = require('http');
const createHandler = require('github-webhook-handler');

const env = process.env;

const handler = createHandler({
    path: "/",
    secret: env.WEBHOOK_SECRET || "dev-secret"
});

http.createServer(function(req, res) {
    handler(req, res, function(err) {
        res.statusCode = 404;
        res.end("No such location");
    });
}).listen(env.GITHUB_APP_PORT || 3333);

const fs = require('fs');
const createApp = require('github-app');

const app = createApp({
    id: env.GITHUB_APP_ID ||"23724",
    cert: fs.readFileSync('vivadoc.2019-01-19.private-key.pem')
});

// TODO do I want this?
handler.on('error', function (err) {
  console.error('Error:', err.message)
});

handler.on('issues', function (event) {
  console.log("EVENT", event);
  if (event.payload.action === 'opened') {
    var installation = event.payload.installation.id;
    app.asInstallation(installation).then(function (github) {
      github.issues.createComment({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        number: event.payload.issue.number,
        body: 'Welcome to the robot uprising.'
      });
    });
  }
});
