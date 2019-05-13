import mongoose = require("mongoose")

const BranchReviewSchema = new mongoose.Schema({
  repoId: { type: String, required: [true, "can't be blank"], index: true },
  repoFullName: { type: String, required: [true, "can't be blank"], index: true },
  branchName: { type: String, required: [true, "can't be blank"], index: true },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  fileReviews: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] }
})

mongoose.model("BranchReview", BranchReviewSchema)
