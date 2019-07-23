const mongoose = require('mongoose');


const PullRequestReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  baseBranchName: { type: String, required: [true, "can't be blank"] },
  pullRequestId: { type: Number, required: [true, "can't be blank" ] },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"], index: true },
  headCommitId: { type: String, required: [true, "can't be blank"], index: true },
  headCommitApprovedTags: { type: [ String ] },
  headCommitRejectedTags: { type: [String ] },
  headCommitUserAssessments: { type: [  { username: String, tagId: String, assessmentType: String } ], required: [true, "can't be blank"] },
  headCommitTagsOwnerGroups: { type: [ { tagId: String, groups: [ [ String ] ] } ], required: [true, "can't be blank"] },
  pendingAnalysisForCommits: { type: [ { head: String, base: String } ], required: [ true, "can't be blank"] },
  analyzedCommitsWithSuccessStatus: { type: [ String ], required: [ true, "can't be blank" ] },
  analyzedCommits: { type: [ String ], required: [ true, "can't be blank"] },
})


mongoose.model("PullRequestReview", PullRequestReviewSchema)
