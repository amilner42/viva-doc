// Top level module for the analysis pipeline.

import R from "ramda"

import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as Lang from "./languages/index"
import * as F from "./functional"

import mongoose from "mongoose"
const PullRequestReviewModel = mongoose.model("PullRequestReview")
import { PullRequestReview } from "./models/PullRequestReview"
const CommitReviewModel = mongoose.model("CommitReview")
import { CommitReview } from "./models/CommitReview"


// TODO CONTINUE HERE ERRORS NEED TO BE HANDLED AND LOGGED.
// @THROWS never. Will handle all errors internally (including logging).
export const pipeline = async (
  pullRequestReview: PullRequestReview,
  getClientUrlForCommitReview: (commitId: string) => string,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) {
    return
  }

  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0]
  const baseCommitId = pullRequestReview.currentAnalysisLastCommitWithSuccessStatus
  const lastAnalyzedCommitId = pullRequestReview.currentAnalysisLastAnalyzedCommit

  await setCommitStatus(
    analyzingCommitId,
    "pending",
    { description: `Analyzing documentation against ${pullRequestReview.baseBranchName} branch...` }
  )

  const fileReviewsNeedingApproval = await
    getFileReviewsWithMetadataNeedingApproval(
      async () => { return retrieveDiff(baseCommitId, analyzingCommitId) },
      async (previousfilePath: string, currentFilePath: string): Promise<[string, string]> => {
        const previousFileContent = await retrieveFile(baseCommitId, previousfilePath)
        const currentFileContent = await retrieveFile(analyzingCommitId, currentFilePath)

        return [ previousFileContent, currentFileContent ]
      }
    )

  // 1. Calculate carry overs and see if current

  const owners = Review.getAllOwners(fileReviewsNeedingApproval)
  const tagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsNeedingApproval)

  // May all have carry-overs from lastAnalyzedCommitId
  let approvedTags: string[];
  let rejectedTags: string[];
  let remainingOwnersToApproveDocs: string[]
  let lastCommitWithSuccessStatus: string;

  // No tags, no carry-overs
  if (owners.length === 0) {

    approvedTags = [];
    rejectedTags = [];
    remainingOwnersToApproveDocs = [];
    lastCommitWithSuccessStatus = analyzingCommitId;
  }

  // Last analyzed commit is base commit, no carry-overs
  else if (lastAnalyzedCommitId === baseCommitId || lastAnalyzedCommitId === null) {

    approvedTags = [];
    rejectedTags = [];
    remainingOwnersToApproveDocs = owners;
    lastCommitWithSuccessStatus = baseCommitId;
  }

  // There are tags and an intermediate commit, calculate possible carry-overs
  else {

    const carryOverData: CarryOverResult = await calculateCarryOversFromLastAnalyzedCommit(
      baseCommitId,
      analyzingCommitId,
      async () => { return retrieveDiff(lastAnalyzedCommitId, analyzingCommitId); },
      async () => {
        const commitReview = await CommitReviewModel.findOne({
          repoId: pullRequestReview.repoId,
          commitId: lastAnalyzedCommitId
        }).exec();

        if (commitReview === null) {
          // TODO
          throw { }
        }

        return commitReview.toObject();
      },
      fileReviewsNeedingApproval
    );

    ({ approvedTags, rejectedTags, remainingOwnersToApproveDocs, lastCommitWithSuccessStatus } = carryOverData);
  }

  // 2. Save new CommitReview with frozen set to false.

  const commitReviewObject: CommitReview = {
    repoId: pullRequestReview.repoId,
    repoName: pullRequestReview.repoName,
    repoFullName: pullRequestReview.repoFullName,
    branchName: pullRequestReview.branchName,
    commitId: analyzingCommitId,
    pullRequestNumber: pullRequestReview.pullRequestNumber,
    fileReviews: fileReviewsNeedingApproval,
    approvedTags,
    rejectedTags,
    remainingOwnersToApproveDocs,
    tagsAndOwners,
    frozen: false
  }

  const commitReview = new CommitReviewModel(commitReviewObject)
  await commitReview.save()

  // 3. Update PullRequestReview

  // First attempt to atomically update assuming this commit is still the most recent commit in the PR.
  const updatePullRequestReviewResult = await PullRequestReviewModel.update(
    {
      repoId: pullRequestReview.repoId,
      pullRequestNumber: pullRequestReview.pullRequestNumber,
      headCommitId: analyzingCommitId
    },
    {
      headCommitApprovedTags: approvedTags,
      headCommitRejectedTags: rejectedTags,
      headCommitRemainingOwnersToApproveDocs: remainingOwnersToApproveDocs,
      headCommitTagsAndOwners: tagsAndOwners,
      $pull: { pendingAnalysisForCommits: analyzingCommitId },
      currentAnalysisLastCommitWithSuccessStatus: lastCommitWithSuccessStatus,
      currentAnalysisLastAnalyzedCommit: analyzingCommitId,
      loadingHeadAnalysis: false
    }
  ).exec()

  // We are done, no need to re-trigger pipeline as this is the head commit so there are no more things to analyze.
  if (updatePullRequestReviewResult.n === 1 && updatePullRequestReviewResult.nModified === 1) {

    if (lastCommitWithSuccessStatus === analyzingCommitId) {
      await setCommitStatus(analyzingCommitId, "success", { description: "No tags required approval" })
    } else {
      await setCommitStatus(
        analyzingCommitId,
        "failure",
        { description: "Tags require approval", target_url: getClientUrlForCommitReview(analyzingCommitId) }
      )
    }

    return;
  }

  // Otherwise, the atomic update failed because this is no longer the head commit
  // This means we must:
  //   - unfreeze the relevant CommitReview
  //   - update PR with non headXXX fields
  //   - set commit status
  //   - retrigger pipeline

  const commitReviewUpdateResult = await CommitReviewModel.update(
    {
      repoId: pullRequestReview.repoId,
      pullRequestNumber: pullRequestReview.pullRequestNumber,
      commitId: analyzingCommitId
    },
    {
      frozen: true
    }
  ).exec();

  // TODO Handle error
  if (commitReviewUpdateResult.n !== 1 || commitReviewUpdateResult.nModified !== 1) {
    console.log(`Could not freeze commit: ${analyzingCommitId}`)
  }

  const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
    {
      repoId: pullRequestReview.repoId,
      pullRequestNumber: pullRequestReview.pullRequestNumber
    },
    {
      $pull: { pendingAnalysisForCommits: analyzingCommitId },
      currentAnalysisLastCommitWithSuccessStatus: lastCommitWithSuccessStatus,
      currentAnalysisLastAnalyzedCommit: analyzingCommitId
    },
    {
      new: true
    }
  ).exec();

  // TODO handle error better.
  if (updatedPullRequestReview === null) {
    throw new Error(`Error : Could not update pull request review with fields --- repoId : ${pullRequestReview.repoId}, pullRequestNumber: ${pullRequestReview.pullRequestNumber}`)
  }

  if (lastCommitWithSuccessStatus === analyzingCommitId) {
    await setCommitStatus(analyzingCommitId, "success", { description: "No tags required approval" })
  } else {
    await setCommitStatus(
      analyzingCommitId,
      "failure",
      { description: "Tags require approval", target_url: getClientUrlForCommitReview(analyzingCommitId) }
    )
  }

  const updatedPullRequestReviewObject: PullRequestReview = updatedPullRequestReview.toObject()

  pipeline(
    updatedPullRequestReviewObject,
    getClientUrlForCommitReview,
    retrieveDiff,
    retrieveFile,
    setCommitStatus
  )

}


export const getFileReviewsWithMetadataNeedingApproval = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
): Promise<Review.FileReviewWithMetadata[]> => {

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff())

  const filesDiffsToAnalyze: Diff.FileDiff[] = R.filter(isLanguageSupported, fileDiffs);

  if (filesDiffsToAnalyze.length === 0) {
    return []
  }

  const fileDiffsWithCode: Tag.FileDiffWithCode[] = await Promise.all(
    filesDiffsToAnalyze.map((fileDiff) => { return attachCode(fileDiff, retrieveFiles) })
  )

  // An array of reviews for each file.
  const fileReviews: Review.FileReviewWithMetadata[] =
    R.pipe<
      Tag.FileDiffWithCode[],
      Tag.FileDiffWithCodeAndTags[],
      Review.FileReview[],
      Review.FileReview[],
      Review.FileReviewWithMetadata[]
    >(
      R.map(Tag.parseTags),
      R.map(Review.getReviews),
      R.filter(Review.fileReviewNeedsApproval),
      R.map(Review.initFileReviewMetadata)
    )(fileDiffsWithCode)

  return fileReviews;
}


interface CarryOverResult {
  approvedTags: string[];
  rejectedTags: string[]
  remainingOwnersToApproveDocs: string[];
  lastCommitWithSuccessStatus: string;
}


export const calculateCarryOversFromLastAnalyzedCommit = async (
  lastCommitWithSuccessStatus: string,
  currentCommitId: string,
  retrieveDiff: () => Promise<any>,
  getLastAnalyzedCommitReview: () => Promise<CommitReview>,
  fileReviewsAgainstLastSuccess: Review.FileReviewWithMetadata[]
  ): Promise<CarryOverResult> => {

  const lastAnalyzedCommitReview: CommitReview = await getLastAnalyzedCommitReview();
  const lastAnalyzedTagsPerFile = Review.getTagsPerFile(
    lastAnalyzedCommitReview.approvedTags,
    lastAnalyzedCommitReview.rejectedTags,
    lastAnalyzedCommitReview.fileReviews
  );

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff());
  const fileDiffsToAnalyze: Diff.FileDiff[] = R.filter(isLanguageSupported, fileDiffs);

  const carryOverApprovedTags: string[] = [];
  const carryOverRejectedTags: string[] = [];

  // Go through all current tags to see which should be approved/rejected as carry-overs.
  for (let fileReview of fileReviewsAgainstLastSuccess) {

    const filePath = fileReview.currentFilePath;
    const newTags = Review.getTagsWithMetadata(fileReview);

    const diffAgainstLastAnalyzedCommit = R.find(
      (fileDiff) => { return fileDiff.currentFilePath === filePath },
      fileDiffsToAnalyze
    );

    // No changes to file since last analyzed commit.
    if (diffAgainstLastAnalyzedCommit === undefined) {

      // We know `lastAnalyzedTagsPerFile[filePath]` is not undefined because it is in this FileReview and there are
      // no diff between this FileReview and the last analyzed one so it must be there as well.
      const { approved, rejected, all } = lastAnalyzedTagsPerFile[filePath];

      // No tags to carry over.
      if ( approved.length === 0 && rejected.length === 0) {
        continue;
      }

      // Otherwise we do have approved/rejected tags within this FileReview we must carry over.
      for (let i = 0; i < all.length; i++) {

        // These form a tag pair as there were no changes so they are the same tag with different IDs.
        const previousTag = all[i];
        const newTag =  newTags[i];

        if (R.contains(previousTag.tagId.toString(), approved)) {
          carryOverApprovedTags.push(newTag.tagId.toString());
          continue;
        }

        if (R.contains(previousTag.tagId.toString(), rejected)) {
          carryOverRejectedTags.push(newTag.tagId.toString());
          continue;
        }
      }

    // Since the last analyzed commit we do have changes to the file.
    } else {

      let filePathInLastAnalyzedCommit: string;

      switch (diffAgainstLastAnalyzedCommit.diffType) {

        // If a file was deleted or added, we can't carry over any tags so continue to next loop.
        case "deleted":
        case "new":
          continue;

        case "modified":
          filePathInLastAnalyzedCommit = diffAgainstLastAnalyzedCommit.currentFilePath;
          break;

        // TS bug forcing me to do default instead of "renamed" even though it detects this is the only other case...
        default:
          filePathInLastAnalyzedCommit = diffAgainstLastAnalyzedCommit.previousFilePath;
          break;
      }

      // There were no tags in the file in the last analyzed commit...
      if (lastAnalyzedTagsPerFile[filePathInLastAnalyzedCommit] === undefined) {
        continue;
      }

      const { rejected, approved, all } = lastAnalyzedTagsPerFile[filePathInLastAnalyzedCommit];

      // No tags to carry over.
      if (rejected.length === 0 && approved.length === 0 ) {
        continue;
      }

      // Otherwise there may be tags to carry over if they were not altered across the diff.
      const tagLinks = Review.getTagLinksBetweenSomeTags(all, newTags, diffAgainstLastAnalyzedCommit.alteredLines);

      for (let index = 0; index < tagLinks.length; index++ ) {

        const tagLink = tagLinks[index];

        if (tagLink === null) {
          continue;
        }

        const tagPair: R.KeyValuePair<Review.TagWithMetadata, Review.TagWithMetadata> =
          [ all[index], newTags[tagLink] ];

        const tagPairUpdated =
          R.any(Review.alteredLineInTagPairOwnership(tagPair), diffAgainstLastAnalyzedCommit.alteredLines)

        // It has been altered so it must be reapproved/rerejected
        if (tagPairUpdated) { continue; }

        // It has not been altered, carry over previous approve/reject status
        const [ previousTag, newTag ] = tagPair as [ Review.TagWithMetadata, Review.TagWithMetadata ]

        if (R.contains(previousTag.tagId.toString(), approved)) {
          carryOverApprovedTags.push(newTag.tagId.toString());
          continue;
        }

        if (R.contains(previousTag.tagId.toString(), rejected)) {
          carryOverRejectedTags.push(newTag.tagId.toString());
          continue;
        }

      }

    }
  }

  const ownerNeededToApproveDocsPreviously = (owner: string) => {
    return R.contains(owner, lastAnalyzedCommitReview.remainingOwnersToApproveDocs);
  }

  const allTagsApproved = (tagsAndOwners: Review.TagAndOwner[], owner: string, approvedTags: string[]): boolean => {

    return R.all((tagAndOwner) => {

      if (tagAndOwner.owner === owner) {
        return R.contains(tagAndOwner.tagId, approvedTags);
      }

      return true;
    }, tagsAndOwners);
  }

  const newTagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsAgainstLastSuccess);
  const allNewOwners = Review.getAllOwners(fileReviewsAgainstLastSuccess);


  const remainingOwnersToApproveDocs = R.filter((owner) => {
    return ownerNeededToApproveDocsPreviously(owner) || !allTagsApproved(newTagsAndOwners, owner, carryOverApprovedTags)
  }, allNewOwners);

  const nextLastCommitWithSuccessStatus =
    remainingOwnersToApproveDocs.length === 0 ? currentCommitId : lastCommitWithSuccessStatus;


  return {
    approvedTags: carryOverApprovedTags,
    rejectedTags: carryOverRejectedTags,
    remainingOwnersToApproveDocs,
    lastCommitWithSuccessStatus: nextLastCommitWithSuccessStatus
  };

}


const attachCode = async (
  fileDiff: Diff.FileDiff,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
  ): Promise<Tag.FileDiffWithCode> => {

  let previousFileContent;
  let currentFileContent;

  switch (fileDiff.diffType) {

    case "modified":
      [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.currentFilePath, fileDiff.currentFilePath)
      return R.merge(fileDiff, {  previousFileContent, currentFileContent })

    case "renamed":
      [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.previousFilePath, fileDiff.currentFilePath)
      return R.merge(fileDiff, { previousFileContent, currentFileContent })

    case "deleted":
      return fileDiff

    case "new":
      return fileDiff
  }
}


const isLanguageSupported = (fileDiff: Diff.FileDiff): boolean => {

  switch (fileDiff.diffType) {

    case "renamed":
      return F.isJust(Lang.getLanguageFromFilePath(fileDiff.previousFilePath))
              && F.isJust(Lang.getLanguageFromFilePath(fileDiff.currentFilePath));

    case "deleted":
    case "new":
    case "modified":
      return F.isJust(Lang.getLanguageFromFilePath(fileDiff.currentFilePath));

  }

}
