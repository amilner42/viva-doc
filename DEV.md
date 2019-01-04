# Useful notes for developers

### Amazon AWS

###### Console

[AWS Console Login](https://257184581980.signin.aws.amazon.com/console/)

###### EC2 Instance

Public address for API: `34.222.123.18/api/`

To SSH:
```bash
ssh -i "viva-doc.pem" ubuntu@ec2-34-222-123-18.us-west-2.compute.amazonaws.com
```

### Github API

We'll have to create a **Github app**, not use Github oauth, because this application will need to
be able to be installed per-repo or per-organization which you can't do with oauth, which is
giving you the permissions of a user. You can read about the two Github options
[here](https://developer.github.com/apps/differences-between-apps/).

Github offers a GraphQL api and even an interactive graphiql explorer
[here](https://developer.github.com/v4/explorer/) but it appears that you cannot currently get the
commit diffs ("patch") through the graphQL API so we will have to use the RESTful API for Github
apps which can be found [here](https://developer.github.com/v3/apps/available-endpoints/).

The form to register a new github app is [here](https://github.com/settings/applications/new).

The instructions about how to build a github app are
[here](https://developer.github.com/apps/quickstart-guides/using-the-github-api-in-your-app/).

NOTE: Check Out [Github API Example Requests](/misc/github-api-examples/requests.md)
