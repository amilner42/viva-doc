import mongoose = require("mongoose")


export interface Repo {
  installationId: number;
  owner: string;
  repoIds: number[];
}


const RepoSchema = new mongoose.Schema({
  installationId: { type: Number, required: [true, "can't be blank"], index: true },
  owner: { type: String, required: [true, "can't be blank"] },
  repoIds: { type: [ Number ], required: [true, "can't be blank"], index: true }
})


mongoose.model("Repo", RepoSchema)
