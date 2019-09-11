# Deployment

We have 4 things we have deployed separately:

1. The Web Client
1. The Mongo Database
1. The API
1. The Github App

###### AWS

[VivaDoc AWS Console Login](https://257184581980.signin.aws.amazon.com/console/)

###### Mongo Atlas

[Mongo Atlas Login](https://cloud.mongodb.com/user#/atlas/login)


### The Web Client

The domain name and advanced DNS configuration are being done on NameCheap under Arie's account. With A-Records we:
  - point the api subdomain to the API
  - point the webhook subdomain to the GitHub App

The web client itself is an SPA so the static files and assets are deployed on an S3 bucket on AWS. We then use
CloudFront to cache the files to make faster loads (this is also needed for `https` support).

Currently you must deploy manually:

```bash
web-client: npm run prod # builds into `dist/`
```

You then copy the new files into the S3 bucket, and you must also run invalidations on CloudFront (to refresh the
cache). You can copy the existing validations and re-run them (it is always the same invalidation).

### Mongo Database

The database is being hosted on Mongo Atlas. This has the benefit of having replica sets, automatic metrics, and
automatic backups. To scale or change any configuration, you will need to log into mongo atlas with Arie's account.

All instances needing to connect to the database can then use the connection string with the appropriate username and
password. Remember, an IP must be whitelisted to be able to access the database.

### The API

The API runs on an ec2 instance. Currently deployments are done by ssh-ing to instance, pulling the code from git,
building the project with `npm run build`, and then restarting the `forever` instance (which runs the code forever)
with the npm command `npm run forever-restartall`.

##### Setting up a new ec2 instance

Create the ec2 instance with the appropriate config (security groups for the API port and SSH; an elastic IP). Pick
an appropriate region and instance size.

```bash
[ec2-user ~]$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash # installs nvm
[ec2-user ~]$ nvm install 11.2.0 # Get this version of node
[ec2-user ~]$ sudo yum install git
[ec2-user ~]$ git clone <vivadoc-repo>
[ec2-user ~]$ cd viva-doc/node-services
[ec2-user ~/viva-doc/node-services]$ npm install
[ec2-user ~/viva-doc/node-services]$ npm run build

# WARNING set the environment variables or this script will complain. The required environment variables can be found
#         in `node-services/src/api/config/index.ts`
#
# You will need the private `.pem` file to be able to deploy, ask Arie for that file.
[ec2-user ~/viva-doc/node-services]$ npm run forever-api-start
```

##### Commands to start / stop / read logs / check status of the API

Everything is in the `node-services/package.json` - importantly, the `forever` commands.

### GitHub App

The GitHub app is under the VivaDoc GitHub organization, so settings and configuration to the app must be made
[here](https://github.com/organizations/VivaDoc/settings/apps/vivadoc) by those who have permissions.

GitHub will trigger and send our GitHub app data according to which webhooks we are subscribed to. The GitHub app
runs on an ec2 instance. Currently deployments are done by ssh-ing to instance, pulling the code from git,
building the project with `npm run build`, and then restarting the `forever` instance (which runs the code forever)
with the npm command `npm run forever-restartall`.

##### Setting up a new ec2 instance

Create the ec2 instance with the appropriate config (security groups for the webhook port and SSH; an elastic IP). Pick
an appropriate region and instance size.

```bash
[ec2-user ~]$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash # installs nvm
[ec2-user ~]$ nvm install 11.2.0 # Get this version of node
[ec2-user ~]$ sudo yum install git
[ec2-user ~]$ git clone <vivadoc-repo>
[ec2-user ~]$ cd viva-doc/node-services
[ec2-user ~/viva-doc/node-services]$ npm install
[ec2-user ~/viva-doc/node-services]$ npm run build

# WARNING set the environment variables or this script will complain. The required environment variables can be found
#         in `node-services/src/github-app/config.ts`
#
# You will also need the private `.pem` file to be able to deploy, ask Arie for that file.
[ec2-user ~/viva-doc/node-services]$ npm run forever-github-app-start
```

##### Commands to start / stop / read logs / check status of the GitHub App

Everything is in the `node-services/package.json` - importantly, the `forever` commands.
