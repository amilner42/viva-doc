# Deployment

## Amazon AWS

Currently everything is hosted on AWS - a single EC2 instance and an S3 bucket.

The ec2 runs:
  - The `api`
  - The `github-app` (gets webhooks from github and calculates reviews).
  - Mongo

The s3 bucket hosts the web client.

### Console

[AWS Console Login](https://257184581980.signin.aws.amazon.com/console/)

### EC2 Instance

Currently the API is [here](http://52.53.218.152:8888/api).

SSH example with current instance:

```bash
ssh -i "viva-doc.pem" ec2-user@ec2-52-53-218-152.us-west-1.compute.amazonaws.com
```

#### Launch Steps

1. Go to amazon and create a new ec2 instance (I've been using NCAl for the region)
2. Pick the Amazon Linux Distro
  - I've used a micro size so far.
3. ssh to the instance
4. Install mongo 3.6 using yum as specified [here](https://docs.mongodb.com/v3.6/tutorial/install-mongodb-on-amazon/)
 - Start the mongod background daemon
5. Install NVM simply with `yum install nvm`
6. Install node 11.2.0 with nvm.
7. Install git with yum.
8. Clone repo.
9. `cd` into `node-services` and `npm install` to get the prod dependencies.
10. Set env variables in the `~/.bashrc`, here is an example:

```bash
# User specific aliases and functions

alias vimbash='vim ~/.bashrc'
alias sourcebash='source ~/.bashrc'

export NODE_ENV="production"
export VD_WEB_CLIENT_ORIGIN="http://viva-doc.s3-website-us-west-1.amazonaws.com"
export VD_MONGODB_URI="mongodb://localhost/viva-doc"
export VD_PORT="8888"
export VD_COOKIE_SECRET="<some-secret>"
export VD_GITHUB_CLIENT_SECRET="<some-secret>"
export VD_GITHUB_CLIENT_ID="<some-client-id>"
export APP_ID="23724" # the app id
export PRIVATE_KEY_PATH="<full-path-to-.pm>"
export WEBHOOK_SECRET="<the-set-webhook-secret>"

export NVM_DIR="/home/ec2-user/.nvm"
```

 - Don't forget to `source ~/.bashrc` to set env vars in the current terminal session.

11. `npm run github-app-forever-start` and `npm run api-forever-start`
  - Starts background processes with `forever`.
12. `npm run forever-list` to find logs / PID to stop instances.

### S3 Bucket

[Info about hosting on S3](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html)

Currently the web-client is hosted [here](http://viva-doc.s3-website-us-west-1.amazonaws.com)

#### Launch Steps

Create a new bucket. Settings:
  - "Block all public access - off"
  - In the `properties` tab, find `static-website-hosting` and set both the index document and error document to `index.html`.

Build the web-client for prod.

```bash
viva-doc: cd web-client;
web-client: npm run prod;
```

Drag and drop `dist/` in the bucket.
  - Make sure the objects are public.

It should be online.

TODO Add steps for connecting the domain name.
