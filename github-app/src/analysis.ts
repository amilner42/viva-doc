// Top level module for the analysis pipeline.

import R from "ramda"

import * as AppError from "./error"
import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as F from "./functional"

import * as PullRequestReview from "./models/PullRequestReview"
import * as CommitReview from "./models/CommitReview"

// Don't use this for anything but types, I've been passing functions into the pipeline for DI purposes.
import * as GH from "./github-helpers";


// TODO DOC
// @THROWS never. Will handle all errors internally (including logging).
export const pipeline = async (
  installationId: number,
  pullRequestReview: PullRequestReview.PullRequestReview,
  getClientUrlForCommitReview: (commitId: string) => string,
  retrievePullRequestCommits: () => ReturnType<typeof GH.listPullRequestCommits>,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  // [PIPELINE] Set `analyzingCommitId` or return if no commits need analysis.

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) { return }
  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0];


  // Helper for recovering from an error while analyzing a commit.
  const recoverFromError =
    async ( maybeErr: F.Maybe<any>
    , maybeStatus: F.Maybe<"failure">
    , commitReviewError: PullRequestReview.CommitReviewError
    ): Promise<void> => {

    recoverFromErrorInPipeline(
      maybeErr,
      maybeStatus,
      commitReviewError,
      installationId,
      pullRequestReview,
      getClientUrlForCommitReview,
      retrievePullRequestCommits,
      retrieveDiff,
      retrieveFile,
      setCommitStatus
    );
  }


  // Helper for skipping the analysis of a commit.
  const skipToNextCommitToAnalyze = async () => {

    let newPullRequestReview: PullRequestReview.PullRequestReview;

    try {

      newPullRequestReview = await PullRequestReview.clearPendingCommitOnAnalysisSkip(
        installationId,
        pullRequestReview.repoId,
        pullRequestReview.pullRequestNumber,
        analyzingCommitId
      );

    } catch (clearPendingCommitOnAnalysisSkipErr) {
      // If we errored skipping a commit, we'll be unable to proceed because pending commits will have this commit.
      // This is fine for now, it'll be logged as a severe error and reviewed. In the meantime the PR will not perform
      // analysis because pending commits will be backed-up.
      AppError.logErrors(clearPendingCommitOnAnalysisSkipErr, null);
      return;
    }

    pipeline(
      installationId,
      newPullRequestReview,
      getClientUrlForCommitReview,
      retrievePullRequestCommits,
      retrieveDiff,
      retrieveFile,
      setCommitStatus
    );

    return;
  }


  // [PIPELINE] Check if this commit has already been analyzed or produced an error in the past.
  //     - Can occur if you drop commits and go back to a previous commit on a force push.
  if ( R.contains(analyzingCommitId, pullRequestReview.analyzedCommits)
        || PullRequestReview.hasErrorForCommitReview(pullRequestReview, analyzingCommitId) ) {
    skipToNextCommitToAnalyze();
    return;
  }

  // [PIPELINE] Get the last analyzed commit and the analysis base commit.
  let analysisBaseCommitId: string, lastAnalyzedCommitId: string;

  try {

    const maybeBaseAndLastAnalyzedCommit = await getBaseAndLastAnalyzedCommit(
      retrievePullRequestCommits,
      pullRequestReview.baseCommitId,
      pullRequestReview.analyzedCommits,
      pullRequestReview.analyzedCommitsWithSuccessStatus,
      analyzingCommitId
    );

    // Commit rebased, no longer exists in pull request commits.
    if (maybeBaseAndLastAnalyzedCommit === null) {
      skipToNextCommitToAnalyze();
      return
    }

    ({ analysisBaseCommitId, lastAnalyzedCommitId } = maybeBaseAndLastAnalyzedCommit);

  } catch (getPullRequestCommitsError) {

    await recoverFromError(
      getPullRequestCommitsError,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: true
      }
    );

    return;
  }

  // [PIPELINE] Set commit status to pending.

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

  // [PIPELINE] Get file reviews.

  let fileReviewsNeedingApproval: Review.FileReviewWithMetadata[];

  try {

    fileReviewsNeedingApproval = await
      getFileReviewsWithMetadataNeedingApproval(
        async () => { return retrieveDiff(analysisBaseCommitId, analyzingCommitId) },
        async (previousfilePath: string, currentFilePath: string): Promise<[string, string]> => {
          const previousFileContent = await retrieveFile(analysisBaseCommitId, previousfilePath)
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

  // [PIPELINE] Calculate carry overs.

  const owners = Review.getAllOwners(fileReviewsNeedingApproval)
  const tagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsNeedingApproval)

  // May all have carry-overs from lastAnalyzedCommitId
  let approvedTags: string[];
  let rejectedTags: string[];
  let remainingOwnersToApproveDocs: string[];
  let currentCommitIsSuccess: boolean;

  try {

    const carryOverResult: CarryOverResult = await calculateCarryOversFromLastAnalyzedCommit(
      owners,
      lastAnalyzedCommitId,
      analysisBaseCommitId,
      analyzingCommitId,
      retrieveDiff,
      async (commitId) => {
        return CommitReview.getExistantCommitReview(installationId, pullRequestReview.repoId, commitId )
      },
      fileReviewsNeedingApproval
    );

    ({ approvedTags, rejectedTags, remainingOwnersToApproveDocs } = carryOverResult);
    currentCommitIsSuccess = remainingOwnersToApproveDocs.length === 0;

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

  // [PIPELINE] Save new CommitReview with frozen set to false.

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

  // [PIPELINE] Attempt to update PullRequestReview assuming this commit is still the most recent commit in the PR.

  let atomicUpdateStatus: "success" | "no-longer-head-commit";

  try {

    atomicUpdateStatus = await PullRequestReview.updateOnCompleteAnalysisForHeadCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      approvedTags,
      rejectedTags,
      remainingOwnersToApproveDocs,
      tagsAndOwners
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

      if (currentCommitIsSuccess) {
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
            description: "Documentation requires approval",
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

  // [PIPELINE] Otherwise, the atomic update failed because this is no longer the head commit.
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

    updatedPullRequestReviewObject = await PullRequestReview.updateOnCompleteAnalysisForNonHeadCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      currentCommitIsSuccess
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

    if (currentCommitIsSuccess) {
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
          description: "Documentation requires approval",
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

  // [PIPELINE] Re-trigger pipeline for further analysis.

  pipeline(
    installationId,
    updatedPullRequestReviewObject,
    getClientUrlForCommitReview,
    retrievePullRequestCommits,
    retrieveDiff,
    retrieveFile,
    setCommitStatus
  );

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
}


export const calculateCarryOversFromLastAnalyzedCommit = async (
  owners: string[],
  lastAnaylzedCommitId: string,
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
    }
  }

  // Last analyzed commit is the last commit with success state, no carry-overs
  if (lastAnaylzedCommitId === lastCommitWithSuccessStatus) {
    return {
      approvedTags: [],
      rejectedTags: [],
      remainingOwnersToApproveDocs: owners
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

  return {
    approvedTags: carryOverApprovedTags,
    rejectedTags: carryOverRejectedTags,
    remainingOwnersToApproveDocs,
  };

}


// Returns:
// If: `analyzingCommitId` is in the pull request commits, then returns an object with:
//     - the last commit before `analyzingCommitId` with a success status or the base commit that the PR is against if
//       no intermediate commits with a success status exist.
//     - the last commit before `analyzingCommitId` that was analyzed or the base commit that the PR is against if
//       no intermediate commits have been analyzed.
//
// Else: `null`. This means the `analyzingCommitId` is no longer in the PR so it must have been rebased before the
//       analysis got here. This is unlikely but possible.
//
// @THROWS only `GithubAppLoggableError` upon failure to get pull request commits.
const getBaseAndLastAnalyzedCommit =
  async ( retrievePullRequestCommits: () => ReturnType<typeof GH.listPullRequestCommits>
        , prBaseCommitId: string
        , analyzedCommits: string[]
        , analyzedCommitsWithSuccessStatus: string[]
        , analyzingCommitId: string
      ) : Promise<F.Maybe<{ analysisBaseCommitId: string, lastAnalyzedCommitId: string }>> => {

  const pullRequestCommits = await retrievePullRequestCommits();

  let visitedAnalyzingCommitId = false;
  let analysisBaseCommitId: string | null = null;
  let lastAnalyzedCommitId: string | null = null;

  // Go through commits from most recent commit to oldest.
  for (let i = pullRequestCommits.length - 1; i >= 0; i--) {

    const currentCommitId = pullRequestCommits[i].sha;

    if (!visitedAnalyzingCommitId) {
      visitedAnalyzingCommitId = currentCommitId === analyzingCommitId;
      continue;
    }

    if (analysisBaseCommitId === null && R.contains(currentCommitId, analyzedCommitsWithSuccessStatus)) {
      analysisBaseCommitId = currentCommitId;
    }

    if (lastAnalyzedCommitId === null && R.contains(currentCommitId, analyzedCommits)) {
      lastAnalyzedCommitId = currentCommitId;
    }

    if (analysisBaseCommitId !== null && lastAnalyzedCommitId !== null) { break; }
  }

  if (!visitedAnalyzingCommitId) {
    return null;
  }

  return {
    analysisBaseCommitId: analysisBaseCommitId === null ? prBaseCommitId : analysisBaseCommitId,
    lastAnalyzedCommitId: lastAnalyzedCommitId === null ? prBaseCommitId : lastAnalyzedCommitId
  }

}


// Handles logging errors, clearing pending commit, optionally set commit status, and continue analysis of other
// commits if there are more pendingAnalysisForCommits.
//
// Note `err` is optional because it may be the case that nothing in the app errored, we simply have just a
//       `commitReviewError` because the user mis-used the app.
//
// @VD amilner42 block
const recoverFromErrorInPipeline =
  async ( err: F.Maybe<any>
        , setStatusTo: F.Maybe<"failure">
        , commitReviewError: PullRequestReview.CommitReviewError
        , installationId: number
        , pullRequestReview: PullRequestReview.PullRequestReview
        , getClientUrlForCommitReview: (commitId: string) => string
        , retrievePullRequestCommits: () => Promise<any>
        , retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>
        , retrieveFile: (commitId: string, filePath: string) => Promise<string>
        , setCommitStatus: ( commitId: string
                           , statusState: "success" | "failure" | "pending"
                           , optional?: { description?: string, target_url?: string }
                           ) => Promise<any>
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
    retrievePullRequestCommits,
    retrieveDiff,
    retrieveFile,
    setCommitStatus
  );

}
// @VD end-block


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
