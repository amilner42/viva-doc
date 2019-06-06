# Viva Doc
##### Long live the doc

### Introduction

##### READMEs

| file | description |
| ---- | ----------- |
| README | General information |
| [DEV](/DEV.md)    | Starting point for new developers |
| [PITCH](/PITCH.md)  | Information related to pitching this idea |
| [APP](/APP.md) | Brainstorming on the app and it's precise features and goals. More detailed than PITCH.md |

### Local Dependencies

- Mongo ~ 3.x
  - Currently 3.x, when the drivers get updated for 4.x I'll upgrade
- Node ~ 11.x
  - You can most likely use older versions of node if you need to
- NPM ~ 6.x
  - You can most likely use older versions of npm if you need to
- [Antlr4](https://www.antlr.org/)
  - If you're going to write parsers/lexers, you'll want to install antlr4 so you can test out your parsers/lexers locally.

### Set Up

###### Web-client

```bash
cd web-client;
npm install;
```

###### Server

```bash
cd api;
npm install;
```

###### Github App

```bash
cd github-app;
npm install;
```

### Developing

###### Web-client

```bash
cd web-client;
npm start;
```

###### Server

```bash
cd api;
npm run dev;
```

###### Probot App

```bash
cd github-app;
npm run build; # build the typescript
npm run dev;
```

If you are working on new grammars, you'll need to compile those grammars:

```bash
# Refer to the package.json to see how exactly it compiles grammars
npm run grammar:javascript
```

### Production

```bash
cd web-client;
npm run prod;
cd ../api;
# Make sure env variables are set
npm run build;
# TODO Add prod build for probot app
```
