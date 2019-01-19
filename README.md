# Viva Doc
##### Long live the doc

### Introduction

##### READMEs

| file | description |
| ---- | ----------- |
| README | General information |
| [DEV](/DEV.md)    | Helpful info for developing |
| [PITCH](/PITCH.md)  | Information related to pitching this idea |
| [APP](/APP.md) | Brainstorming on the app and it's precise features and goals. More detailed than PITCH.md |

### Local Dependencies

- Mongo ~ 3.x
  - Currently 3.x, when the drivers get updated for 4.x I'll upgrade
- Node ~ 11.x
  - You can most likely use older versions of node if you need to
- NPM ~ 6.x
  - You can most likely use older versions of npm if you need to

### Set Up

```bash
cd web-client;
npm install;
cd ../backend;
npm install;
```

### Developing

Terminal Tab 1

```bash
cd web-client;
npm start;
```

Terminal Tab 2

```bash
cd backend;
npm run dev;
```

### Production

```bash
cd web-client;
npm run prod;
cd ../backend;
# Make sure env variables are set
npm run build;
```
