const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const findOrCreate = require('mongoose-find-or-create');
const config = require('../config');

const UserSchema = new mongoose.Schema({
  githubId: {type: String, unique: true, required: [true, "can't be blank"], index: true},
  username: {type: String, unique: false, required: [true, "can't be blank"] },
  displayName: {type: String, unique: false, required: [true, "can't be blank"] },
  profileUrl: {type: String, unique: false, required: [true, "can't be blank"] },
  accessToken: {type: String, unique: false, required: [true, "can't be blank"]}
}, {timestamps: true});

// Plugins
UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});
UserSchema.plugin(findOrCreate);

mongoose.model('User', UserSchema);
