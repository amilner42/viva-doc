const mongoose = require('mongoose');


const RepoSchema = new mongoose.Schema({
  repoId: { type: String, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  owner: { type: String, required: [true, "can't be blank"] },
  installationId: { type: Number, required: [true, "can't be blank"] }
})


mongoose.model("Repo", RepoSchema)
