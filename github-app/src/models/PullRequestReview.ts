import mongoose = require("mongoose")

export interface PullRequestReview {
  repoId: string,
  repoFullName: string,
  branchName: string,
  baseBranchName: string,
  pullRequestId: string,
  pullRequestNumber: number,
  headCommitId: string,
  headCommitApprovedTags: string[] | null,
  headCommitRejectedTags: string[] | null,
  headCommitRemainingOwnersToApproveDocs: string[] | null,
  headCommitTagsAndOwners: { owner: string, tagId: string }[] | null,
  pendingAnalysisForCommits: string[],
  currentAnalysisLastCommitWithSuccessStatus: string,
  currentAnalysisLastAnalyzedCommit: string | null
}

const PullRequestReviewSchema = new mongoose.Schema({
  repoId: { type: String, required: [true, "can't be blank"], index: true },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  baseBranchName: { type: String, required: [true, "can't be blank"] },
  pullRequestId: { type: String, required: [true, "can't be blank" ] },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"], index: true },
  headCommitId: { type: String, required: [true, "can't be blank"] },
  headCommitApprovedTags: { type: [ String ] },
  headCommitRejectedTags: { type: [String ] },
  headCommitRemainingOwnersToApproveDocs: { type: [ String ] },
  headCommitTagsAndOwners: { type: [ { owner: String, tagId: String }]},
  pendingAnalysisForCommits: { type: [ String ], required: [ true, "can't be blank"] },
  currentAnalysisLastCommitWithSuccessStatus: { type: String, required: [ true, "can't be blank" ] },
  currentAnalysisLastAnalyzedCommit: { type: String }
})

mongoose.model("PullRequestReview", PullRequestReviewSchema)
