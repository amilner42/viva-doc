# Dev

### Amazon AWS

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
click the viva-doc bucket, and you can easily re-upload a newer frontend by dragging over
the static website files (build the frontend in production) into the bucket.

Currently the frontend is hosted [here](http://viva-doc.s3-website-us-west-2.amazonaws.com).

- [Info about hosting on S3](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html)

### Github

###### Auth Flow

We'll have to create a __Github App__ AND use __Github OAuth__ for our apps flow [read about both
[here](https://developer.github.com/apps/differences-between-apps/)], similar to the flow
of [Travis CI](https://travis-ci.org/).

We will use the OAuth for the user to sign into the app, providing a simple 1-step
"Sign in with Github" process for user acquisition. We will request minimal permissions at this
stage, for instance not being able to see repository code, but we will be able to list all the
repositories of a user and allow them to sign up those repositories for the Github App if
they have admin access over that repository.

- [Register a new Github App](https://github.com/settings/applications/new).
- [Github App Quickstart Guide](https://developer.github.com/apps/quickstart-guides/using-the-github-api-in-your-app/).
- [Github OAuth web flow](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#web-application-flow).
- [Authenticating Github Apps](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps)
- [Configuring Github apps](https://developer.github.com/apps/quickstart-guides/setting-up-your-development-environment/)

###### API

Github offers a GraphQL api and even an interactive Graphiql explorer
[here](https://developer.github.com/v4/explorer/) but it appears that you cannot currently get the
commit diffs ("patch") through the graphQL API so we will have to use the RESTful API for Github
apps which can be found [here](https://developer.github.com/v3/apps/available-endpoints/).

- [Github API Example Requests](/misc/github-api-examples/requests.md)
