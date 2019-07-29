const mongoose = require('mongoose');


const CommitReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"], index: true },
  branchName: { type: String, required: [true, "can't be blank"], index: true },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"] },
  fileReviews: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  approvedTags: { type: [ String ], required: [true, "can't be blank"] },
  rejectedTags: { type: [ String ], required: [true, "can't be blank"] },
  userAssessments: { type: [ { _id: false, username: String, tagId: String, assessmentType: String }  ], required: [true, "can't be blank"] },
  tagsOwnerGroups: { type: [ { _id: false, tagId: String, groups: [ [ String ] ] } ], required: [true, "can't be blank"]},
})


mongoose.model("CommitReview", CommitReviewSchema)
