const mongoose = require("mongoose")

const BranchReviewMetadataSchema = new mongoose.Schema({
  repoId: { type: String, required: [true, "can't be blank"], index: true },
  branchName: { type: String, required: [true, "can't be blank"], index: true },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  approvedTags: { type: [ String ], required: [true, "can't be blank"] },
  requiredConfirmations: { type: [ String ], required: [true, "can't be blank" ], index: true }
})

mongoose.model("BranchReviewMetadata", BranchReviewMetadataSchema)
