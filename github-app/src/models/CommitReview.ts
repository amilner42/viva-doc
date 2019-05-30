import mongoose = require("mongoose")

const CommitReviewSchema = new mongoose.Schema({
  repoId: { type: String, required: [true, "can't be blank"], index: true },
  repoFullName: { type: String, required: [true, "can't be blank"], index: true },
  branchName: { type: String, required: [true, "can't be blank"], index: true },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"] },
  fileReviews: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  approvedTags: { type: [ String ], required: [true, "can't be blank"] },
  rejectedTags: { type: [ String ], required: [true, "can't be blank"] },
  remainingOwnersToApproveDocs: { type: [ String ], required: [true, "can't be blank"] },
  tagsAndOwners: { type: [ { owner: String, tagId: String } ], required: [true, "can't be blank"]}
})

mongoose.model("CommitReview", CommitReviewSchema)
