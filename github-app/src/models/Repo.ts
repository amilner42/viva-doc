import mongoose = require("mongoose")


export interface Repo {
  installationId: number;
  owner: string;
  repos: { repoId: string, repoName: string }[];
}


const RepoSchema = new mongoose.Schema({
  installationId: { type: Number, required: [true, "can't be blank"], index: true },
  owner: { type: String, required: [true, "can't be blank"] },
  repos: { type: [ { _id: false, repoId: String, repoName: String } ], required: [true, "can't be blank"], index: true }
})


mongoose.model("Repo", RepoSchema)
