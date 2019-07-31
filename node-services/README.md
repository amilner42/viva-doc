# Node Services

Currently there are two node services, one for the `github-app` and one for the `api`. They both are in typescript and share code with each other. Code specific to the github-app is in `src/github-app/` and code specific to the api is in
`src/api/`.

## Setup

```sh
# Install dependencies for all node services.
npm install

# Build typescript for all services.
npm run build

# Run the github app
npm run github-app-start

# Run the api
npm run api-start
```
