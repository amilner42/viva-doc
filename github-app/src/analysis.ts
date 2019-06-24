// Top level module for the analysis pipeline.

import R from "ramda"

import * as AppError from "./error"
import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as F from "./functional"

import * as PullRequestReview from "./models/PullRequestReview"
import * as CommitReview from "./models/CommitReview"


// TODO DOC
// @THROWS never. Will handle all errors internally (including logging).
export const pipeline = async (
  installationId: number,
  pullRequestReview: PullRequestReview.PullRequestReview,
  getClientUrlForCommitReview: (commitId: string) => string,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) { return }

  // Handles logging errors, clearing pending commit, optionally set commit status, and continue analysis of other
  // commits if there are more pendingAnalysisForCommits.
  //
  // Note `err` is optional because it may be the case that nothing in the app errored, we simply have just a
  //       `commitReviewError` because the user mis-used the app.
  //
  // @VD amilner42 block
  const recoverFromError =
    async ( err: F.Maybe<any>
          , setStatusTo: F.Maybe<"failure">
          , commitReviewError: PullRequestReview.CommitReviewError
        ): Promise<void> => {

    const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0];

    if (F.isJust(err)) {
      await AppError.logErrors(err, null);
    }

    let newPullRequestReview: PullRequestReview.PullRequestReview;

    try {

      newPullRequestReview = await PullRequestReview.clearPendingCommitOnAnalysisFailure(
        installationId,
        pullRequestReview.repoId,
        pullRequestReview.pullRequestNumber,
        analyzingCommitId,
        commitReviewError,
        null
      );

    } catch (clearPendingCommitError) {

      await AppError.logErrors(clearPendingCommitError, null);

      if (setStatusTo !== null) {

        try {

          const description =
            "VivaDoc had an internal issue and is in an errored state, it won't work on this PR. Arie has been notified for review.";

          await setCommitStatus(
            analyzingCommitId,
            setStatusTo,
            { description }
          );

        } catch (setCommitStatusError) {

          await AppError.logErrors(setCommitStatusError, null);
        }
      }

      // If we can't clear the pending commit, something is really going wrong and there's no point in continuing
      // analyzing other commits.
      return;
    }

    if (setStatusTo !== null) {

      const description = "VivaDoc failed to process this commit."

      try {

        await setCommitStatus(
          analyzingCommitId,
          setStatusTo,
          { description, target_url: getClientUrlForCommitReview(analyzingCommitId) }
        );

      } catch (setCommitStatusError) {

        await AppError.logErrors(setCommitStatusError, null);

      }
    }

    pipeline(
      installationId,
      newPullRequestReview,
      getClientUrlForCommitReview,
      retrieveDiff,
      retrieveFile,
      setCommitStatus
    );

  }
  // @VD end-block


  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0]
  const baseCommitId = pullRequestReview.currentAnalysisLastCommitWithSuccessStatus
  const lastAnalyzedCommitId = pullRequestReview.currentAnalysisLastAnalyzedCommit

  try {

    await setCommitStatus(
      analyzingCommitId,
      "pending",
      {
        description: `Analyzing documentation against ${pullRequestReview.baseBranchName} branch...`,
        target_url: getClientUrlForCommitReview(analyzingCommitId)
      }
    );

  } catch (setCommitStatusError) {

    await recoverFromError(
      setCommitStatusError,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  let fileReviewsNeedingApproval: Review.FileReviewWithMetadata[];

  try {

    fileReviewsNeedingApproval = await
      getFileReviewsWithMetadataNeedingApproval(
        async () => { return retrieveDiff(baseCommitId, analyzingCommitId) },
        async (previousfilePath: string, currentFilePath: string): Promise<[string, string]> => {
          const previousFileContent = await retrieveFile(baseCommitId, previousfilePath)
          const currentFileContent = await retrieveFile(analyzingCommitId, currentFilePath)

          return [ previousFileContent, currentFileContent ]
        }
      );

  } catch (err) { 

    const maybeParseTagError = AppError.isGithubAppParseTagError(err);

    if (maybeParseTagError !== null) {
      await recoverFromError(
        null,
        "failure",
        {
          commitReviewError: true,
          commitId: analyzingCommitId,
          clientExplanation: maybeParseTagError.clientExplanation,
          failedToSaveCommitReview: true
        }
      );
      return;
    }

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal, // TODO could be made better.
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // 1. Calculate carry overs.

  const owners = Review.getAllOwners(fileReviewsNeedingApproval)
  const tagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsNeedingApproval)

  // May all have carry-overs from lastAnalyzedCommitId
  let approvedTags: string[];
  let rejectedTags: string[];
  let remainingOwnersToApproveDocs: string[];
  let lastCommitWithSuccessStatus: string;

  try {

    const carryOverResult: CarryOverResult = await calculateCarryOversFromLastAnalyzedCommit(
      owners,
      lastAnalyzedCommitId,
      baseCommitId,
      analyzingCommitId,
      retrieveDiff,
      async (commitId) => {
        return CommitReview.getExistantCommitReview(installationId, pullRequestReview.repoId, commitId )
      },
      fileReviewsNeedingApproval
    );

    ({ approvedTags, rejectedTags, remainingOwnersToApproveDocs, lastCommitWithSuccessStatus } = carryOverResult);

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal, // TODO could be better error.
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // 2. Save new CommitReview with frozen set to false.

  try {

    await CommitReview.newCommitReview(installationId, {
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
    });

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // 3. Update PullRequestReview

  // First attempt to atomically update assuming this commit is still the most recent commit in the PR.

  let atomicUpdateStatus: "success" | "no-longer-head-commit";

  try {

    atomicUpdateStatus = await PullRequestReview.updateFieldsForHeadCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      approvedTags,
      rejectedTags,
      remainingOwnersToApproveDocs,
      tagsAndOwners,
      lastCommitWithSuccessStatus,
      analyzingCommitId
    );

  } catch (err) {

    await recoverFromError(
      err,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      }
    );
    return;
  }

  if ( atomicUpdateStatus === "success" ) {

    try {

      if (lastCommitWithSuccessStatus === analyzingCommitId) {
        await setCommitStatus(
          analyzingCommitId,
          "success",
          {
            description: "No tags required approval",
            target_url: getClientUrlForCommitReview(analyzingCommitId)
          }
        );
      } else {
        await setCommitStatus(
          analyzingCommitId,
          "failure",
          {
            description: "Tags require approval",
            target_url: getClientUrlForCommitReview(analyzingCommitId)
          }
        )
      }

      return;

    } catch (err) {

      await recoverFromError(
        err,
        null,
        {
          commitReviewError: true,
          commitId: analyzingCommitId,
          clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
          failedToSaveCommitReview: false
        }
      );

      return;
    }

  }

  // Otherwise, the atomic update failed because this is no longer the head commit
  // This means we must:
  //   - freeze the relevant CommitReview
  //   - update PR with non headXXX fields
  //   - set commit status
  //   - retrigger pipeline

  try {
    await CommitReview.freezeCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId
    );
  } catch (err) {
    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      }
    );
    return;
  }

  let updatedPullRequestReviewObject: PullRequestReview.PullRequestReview;

  try {

    updatedPullRequestReviewObject = await PullRequestReview.updateNonHeadCommitFields(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      lastCommitWithSuccessStatus
    );

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      }
    );
    return;
  }

  try {

    if (lastCommitWithSuccessStatus === analyzingCommitId) {
      await setCommitStatus(
        analyzingCommitId,
        "success",
        {
          description: "No tags required approval",
          target_url: getClientUrlForCommitReview(analyzingCommitId)
        }
      );
    } else {
      await setCommitStatus(
        analyzingCommitId,
        "failure",
        {
          description: "Tags require approval",
          target_url: getClientUrlForCommitReview(analyzingCommitId)
        }
      );
    }

  } catch (err) {

    await recoverFromError(
      err,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: false
      }
    );
  }

  pipeline(
    installationId,
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
  const filesDiffsToAnalyze: Diff.FileDiffWithLanguage[] = Diff.toFileDiffsWithLanguage(fileDiffs);

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
  owners: string[],
  lastAnaylzedCommitId: string | null,
  lastCommitWithSuccessStatus: string,
  currentCommitId: string,
  retrieveDiff: (baseId: string, headId: string) => Promise<any>,
  getCommitReview: (commitId: string) => Promise<CommitReview.CommitReview>,
  fileReviewsAgainstLastSuccess: Review.FileReviewWithMetadata[]
  ): Promise<CarryOverResult> => {

  // No tags, no carry-overs.
  if (owners.length === 0) {
    return {
      approvedTags: [],
      rejectedTags: [],
      remainingOwnersToApproveDocs: [],
      lastCommitWithSuccessStatus: currentCommitId
    }
  }

  // Last analyzed commit is the last commit with success state, no carry-overs
  if (lastAnaylzedCommitId === null || lastAnaylzedCommitId === lastCommitWithSuccessStatus) {
    return {
      approvedTags: [],
      rejectedTags: [],
      remainingOwnersToApproveDocs: owners,
      lastCommitWithSuccessStatus
    }
  }

  // Otherwise we may have actual carry-overs to compute.

  const lastAnalyzedCommitReview: CommitReview.CommitReview = await getCommitReview(lastAnaylzedCommitId);
  const lastAnalyzedTagsPerFile = Review.getTagsPerFile(
    lastAnalyzedCommitReview.approvedTags,
    lastAnalyzedCommitReview.rejectedTags,
    lastAnalyzedCommitReview.fileReviews
  );

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff(lastAnaylzedCommitId, currentCommitId));
  const fileDiffsToAnalyze: Diff.FileDiffWithLanguage[] = Diff.toFileDiffsWithLanguage(fileDiffs);

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
  fileDiff: Diff.FileDiffWithLanguage,
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
