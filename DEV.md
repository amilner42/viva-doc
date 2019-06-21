# Dev

## App Flow

#### Authorization and Interaction between Server and Github App

We'll have to create a __Github App__ AND use __Github OAuth__ for our apps flow [read about both
[here](https://developer.github.com/apps/differences-between-apps/)], similar to the flow
of [Travis CI](https://travis-ci.org/).

We will use the OAuth for the user to sign into the app, providing a simple 1-step
"Sign in with Github" process for user acquisition. We will request minimal permissions at this
stage, for instance not being able to see repository code, but we will be able to list all the
repositories of a user and allow them to sign up those repositories for the Github App if
they have admin access over that repository. I will likely have the github-app - which in our case
uses [probot](https://probot.github.io) which is a platform for making github apps - interact with the server
by storing things directly in the server database.

#### Github API

Github offers a GraphQL api and even an interactive Graphiql explorer
[here](https://developer.github.com/v4/explorer/) but it appears that you cannot currently get the
commit diffs ("patch") through the graphQL API so we will have to use the RESTful API for Github
apps which can be found [here](https://developer.github.com/v3/apps/available-endpoints/).

#### Helpful Links

- [Register a new Github App](https://github.com/settings/applications/new).
- [Github App Quickstart Guide](https://developer.github.com/apps/quickstart-guides/using-the-github-api-in-your-app/).
- [Github OAuth web flow](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#web-application-flow).
- [Authenticating Github Apps](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps)
- [Configuring Github apps](https://developer.github.com/apps/quickstart-guides/setting-up-your-development-environment/)
- [Probot github apps in Node](https://probot.github.io)
