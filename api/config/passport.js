const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const mongoose = require('mongoose');
const UserModel = mongoose.model('User');
const config = require('../config');

passport.use(new GitHubStrategy({
    clientID: config.githubClientId,
    clientSecret: config.githubClientSecret,
    callbackURL: config.githubCallbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    UserModel.findOrCreate(
      { githubId: profile.id },
      // These fields can change so we can't search by them
      {
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        accessToken: accessToken
      },
      function (err, user) {
        return done(err, user);
      });
    }
));

// Serialize by id
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

// Deserialize by id
passport.deserializeUser(function(id, done) {
  UserModel.findById(id)
  .then((usr) => done(null, usr))
  .catch((err) => done(err));
});
