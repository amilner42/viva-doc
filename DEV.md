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

## Deployment

#### Amazon AWS

WARNING: I've currently suspended my AWS account because for testing [smee](https://smee.io) has been working great,
I'll put it back online when we actually **ship it**.

###### Console

[AWS Console Login](https://257184581980.signin.aws.amazon.com/console/)

###### EC2 Instance

Public address for API: `34.222.123.18:3001/api/`

To SSH:
```bash
ssh -i "viva-doc.pem" ubuntu@ec2-34-222-123-18.us-west-2.compute.amazonaws.com
```

###### S3 Bucket

The static website is hosted on an s3 bucket. From the AWS console go to the s3 console,
click the viva-doc bucket, and you can easily re-upload a newer web-client by dragging over
the static website files (build the web-client in production) into the bucket.

Currently the web-client is hosted [here](http://viva-doc.s3-website-us-west-2.amazonaws.com).

- [Info about hosting on S3](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html)
