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
  retrievePullRequestCommits: () => Promise<GH.PullRequestCommits>,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  // [PIPELINE] Set `analyzingCommitId` or return if no commits need analysis.

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) { return }
  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0].head;
  const prBaseCommitIdForAnalyzingCommit = pullRequestReview.pendingAnalysisForCommits[0].base;

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

  let pullRequestCommits: GH.PullRequestCommits;

  try {

    pullRequestCommits = await retrievePullRequestCommits();

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

  // [PIPELINE] Get the last analyzed commit and the analysis base commit.

  let maybeBaseAndLastAnalyzedCommit: ReturnType<typeof getBaseAndLastAnalyzedCommit>;

  try {

    maybeBaseAndLastAnalyzedCommit = getBaseAndLastAnalyzedCommit(
      installationId,
      pullRequestCommits,
      prBaseCommitIdForAnalyzingCommit,
      pullRequestReview.analyzedCommits,
      pullRequestReview.analyzedCommitsWithSuccessStatus,
      analyzingCommitId
    );

  } catch (getBaseAndLastAnalyzedCommitErr) {

    await recoverFromError(
      getBaseAndLastAnalyzedCommitErr,
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

  // Commit rebased, no longer exists in pull request commits.
  if (maybeBaseAndLastAnalyzedCommit === null) {
    skipToNextCommitToAnalyze();
    return;
  }

  const { analysisBaseCommitId, intermediateAnalyzedCommitId } = maybeBaseAndLastAnalyzedCommit;

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
      intermediateAnalyzedCommitId,
      analyzingCommitId,
      retrieveDiff,
      retrieveFile,
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

  // [PIPELINE] Save new CommitReview.

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
  //   - update PR with non headXXX fields
  //   - set commit status
  //   - retrigger pipeline

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


const getUnalteredTagsAcrossDiff =
  async ( tagsAgainstBase: Review.TagWithMetadata[]
        , diffAgainstIntermediate: Diff.ModifiedFileDiffWithLanguage | Diff.RenamedFileDiffWithLanguage | undefined
        , retrieveIntermediateFileContent: () => Promise<string>
        , intermediateFilePath: string
        ) : Promise<Review.TagWithMetadata[]> => {

  const unalteredTagsAcrossDiff: Review.TagWithMetadata[] = [];

  if (diffAgainstIntermediate === undefined) { return tagsAgainstBase; }

  const intermediateFileContent = await retrieveIntermediateFileContent();
  const intermediateFileTags = Tag.getFileTags(
    diffAgainstIntermediate.currentLanguage,
    intermediateFileContent,
    intermediateFilePath
  );

  const tagLinks = Review.getTagLinksBetweenSomeTags(
    intermediateFileTags,
    tagsAgainstBase,
    diffAgainstIntermediate.alteredLines
  );

  for (let index = 0; index < tagLinks.length; index++) {

    const tagLink = tagLinks[index];
    if (tagLink === null) { continue; }

    const linkFromTag = intermediateFileTags[index];
    const linkToTag = tagsAgainstBase[tagLink];

    const tagPair: R.KeyValuePair<Tag.VdTag, Review.TagWithMetadata> = [ linkFromTag, linkToTag ];

    const tagPairUpdated = R.any(Review.alteredLineInTagPairOwnership(tagPair), diffAgainstIntermediate.alteredLines);

    if (!tagPairUpdated) { unalteredTagsAcrossDiff.push(linkToTag); }
  }

  return unalteredTagsAcrossDiff;
}


const getCarryOverTagsFromIntermediateCommitReviewTagsPerFile =
  ( intermediateCommitReviewTags: Review.CommitReviewTagsPerFile
  , unalteredTagsSinceIntermediateCommit: Review.TagWithMetadata[]
  , diffAgainstIntermediate: Diff.ModifiedFileDiffWithLanguage | Diff.RenamedFileDiffWithLanguage | undefined
  ) : { approvedTagsForFile: string[], rejectedTagsForFile: string[] } => {

  const alteredLines = diffAgainstIntermediate === undefined ? [] : diffAgainstIntermediate.alteredLines;

  const tagLinks = Review.getTagLinksBetweenSomeTags(
    intermediateCommitReviewTags.all,
    unalteredTagsSinceIntermediateCommit,
    alteredLines
  );

  const newTagsToPreviousApprovalStateMap: { [newTagId: string]: "approved" | "rejected" | "unresolved" | undefined } = { };

  for (let index = 0; index < tagLinks.length; index++) {
    const tagLink = tagLinks[index];
    if (tagLink === null) { continue; }

    const linkFromTag = intermediateCommitReviewTags.all[index];
    const linkToTag = unalteredTagsSinceIntermediateCommit[tagLink];

    newTagsToPreviousApprovalStateMap[linkToTag.tagId.toString()] = Review.getTagApprovalState(
      linkFromTag.tagId.toString(),
      intermediateCommitReviewTags
    );
  }

  const approvedTagsForFile = [];
  const rejectedTagsForFile = [];

  for (let unalteredTag of unalteredTagsSinceIntermediateCommit) {

    const tagId = unalteredTag.tagId.toString();
    const previousApprovalState = newTagsToPreviousApprovalStateMap[tagId];

    if (previousApprovalState === undefined || previousApprovalState === "approved") {
      approvedTagsForFile.push(tagId);
      continue;
    }

    if (previousApprovalState === "rejected") {
      rejectedTagsForFile.push(tagId);
      continue;
    }
  }

  return { approvedTagsForFile, rejectedTagsForFile };
}


interface CarryOverResult {
  approvedTags: string[];
  rejectedTags: string[]
  remainingOwnersToApproveDocs: string[];
}


export const calculateCarryOversFromLastAnalyzedCommit =
  async ( owners: string[]
        , intermediateAnalyzedCommitId: string | null
        , currentCommitId: string
        , retrieveDiff: (baseId: string, headId: string) => Promise<any>
        , retrieveFile: (commitId: string, filePath: string) => Promise<string>
        , getCommitReview: (commitId: string) => Promise<CommitReview.CommitReview>
        , fileReviewsAgainstBase: Review.FileReviewWithMetadata[]
        ): Promise<CarryOverResult> => {

  // No tags, no carry-overs.
  if (owners.length === 0) {
    return {
      approvedTags: [],
      rejectedTags: [],
      remainingOwnersToApproveDocs: [],
    }
  }

  if (intermediateAnalyzedCommitId === null) {
    return {
      approvedTags: [],
      rejectedTags: [],
      remainingOwnersToApproveDocs: owners
    }
  }

  // Otherwise we may have actual carry-overs to compute.
  const intermediateCommitReview: CommitReview.CommitReview = await getCommitReview(intermediateAnalyzedCommitId);
  const intermediateCommitReviewTagsPerFileHashMap = Review.getTagsPerFileHashMap(
    intermediateCommitReview.approvedTags,
    intermediateCommitReview.rejectedTags,
    intermediateCommitReview.fileReviews
  );

  const intermediateDiff = await retrieveDiff(intermediateAnalyzedCommitId, currentCommitId);

  const fileDiffsAgainstIntermediateCommit = Diff.parseDiff(intermediateDiff);
  const fileDiffsToAnalyzeAgainstIntermediateCommit = Diff.toFileDiffsWithLanguage(fileDiffsAgainstIntermediateCommit);

  const carryOverApprovedTags: string[] = [];
  const carryOverRejectedTags: string[] = [];

  for (let fileReviewAgainstBase of fileReviewsAgainstBase) {

    const currentFilePath = fileReviewAgainstBase.currentFilePath;
    const diffAgainstIntermediateCommit: Diff.FileDiffWithLanguage | undefined = R.find(
      (fileDiff) => { return fileDiff.currentFilePath === currentFilePath },
      fileDiffsToAnalyzeAgainstIntermediateCommit
    );

    // If the file is new/deleted since the intermediate commit, there will be no carry-overs.

    if (diffAgainstIntermediateCommit !== undefined) {
      switch (diffAgainstIntermediateCommit.diffType) {

        case "new":
        case "deleted":
          continue;

        case "renamed":
        case "modified":
          break;
      }
    }

    // Otherwise there may be carry-overs.

    const intermediateFilePath: string = (() => {
      if (diffAgainstIntermediateCommit === undefined) {
        return currentFilePath;
      }

      switch (diffAgainstIntermediateCommit.diffType) {
        case "modified":
          return currentFilePath;

        case "renamed":
          return diffAgainstIntermediateCommit.previousFilePath;
      }
    })();
    const tagsAgainstBase = Review.getTagsWithMetadata(fileReviewAgainstBase);
    const unalteredTagsSinceIntermediateCommit = await getUnalteredTagsAcrossDiff(
      tagsAgainstBase,
      diffAgainstIntermediateCommit,
      () => { return retrieveFile(intermediateAnalyzedCommitId, intermediateFilePath); },
      intermediateFilePath
    );
    const unalteredTagIdsSinceIntermediateCommit =
      unalteredTagsSinceIntermediateCommit.map((tag) => { return tag.tagId.toString(); });

    const intermediateCommitReviewTagsPerFile = intermediateCommitReviewTagsPerFileHashMap[intermediateFilePath];

    if (intermediateCommitReviewTagsPerFile === undefined) {
      carryOverApprovedTags.push(...unalteredTagIdsSinceIntermediateCommit);
      continue;
    }

    const { approvedTagsForFile, rejectedTagsForFile } = getCarryOverTagsFromIntermediateCommitReviewTagsPerFile(
      intermediateCommitReviewTagsPerFile,
      unalteredTagsSinceIntermediateCommit,
      diffAgainstIntermediateCommit
    );

    carryOverApprovedTags.push(...approvedTagsForFile);
    carryOverRejectedTags.push(...rejectedTagsForFile);
  }

  return {
    approvedTags: carryOverApprovedTags,
    rejectedTags: carryOverRejectedTags,
    remainingOwnersToApproveDocs: owners /* TODO */
  };

}


  //
  // const lastAnalyzedCommitReview: CommitReview.CommitReview = await getCommitReview(intermediateAnalyzedCommitId);
  // const lastAnalyzedTagsPerFile = Review.getTagsPerFile(
  //   lastAnalyzedCommitReview.approvedTags,
  //   lastAnalyzedCommitReview.rejectedTags,
  //   lastAnalyzedCommitReview.fileReviews
  // );
  //
  // const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff(intermediateAnalyzedCommitId, currentCommitId));
  // const fileDiffsToAnalyze: Diff.FileDiffWithLanguage[] = Diff.toFileDiffsWithLanguage(fileDiffs);

  // const carryOverApprovedTags: string[] = [];
  // const carryOverRejectedTags: string[] = [];

  // Go through all current tags to see which should be approved/rejected as carry-overs.


  // for (let fileReview of fileReviewsAgainstLastSuccess) {
  //
  //   const filePath = fileReview.currentFilePath;
  //   const newTags = Review.getTagsWithMetadata(fileReview);
  //
  //   const diffAgainstLastAnalyzedCommit = R.find(
  //     (fileDiff) => { return fileDiff.currentFilePath === filePath },
  //     fileDiffsToAnalyze
  //   );
  //
  //   // No changes to file since last analyzed commit.
  //   if (diffAgainstLastAnalyzedCommit === undefined) {
  //
  //     // We know `lastAnalyzedTagsPerFile[filePath]` is not undefined because it is in this FileReview and there are
  //     // no diff between this FileReview and the last analyzed one so it must be there as well.
  //     console.log(`was this it? ${filePath}, ${JSON.stringify(lastAnalyzedTagsPerFile[filePath])}`);
  //     const { approved, rejected, all } = lastAnalyzedTagsPerFile[filePath];
  //
  //     // No tags to carry over.
  //     if ( approved.length === 0 && rejected.length === 0) {
  //       continue;
  //     }
  //
  //     // Otherwise we do have approved/rejected tags within this FileReview we must carry over.
  //     for (let i = 0; i < all.length; i++) {
  //
  //       // These form a tag pair as there were no changes so they are the same tag with different IDs.
  //       const previousTag = all[i];
  //       const newTag =  newTags[i];
  //
  //       if (R.contains(previousTag.tagId.toString(), approved)) {
  //         carryOverApprovedTags.push(newTag.tagId.toString());
  //         continue;
  //       }
  //
  //       if (R.contains(previousTag.tagId.toString(), rejected)) {
  //         carryOverRejectedTags.push(newTag.tagId.toString());
  //         continue;
  //       }
  //     }
  //
  //   // Since the last analyzed commit we do have changes to the file.
  //   } else {
  //
  //     let filePathInLastAnalyzedCommit: string;
  //
  //     switch (diffAgainstLastAnalyzedCommit.diffType) {
  //
  //       // If a file was deleted or added, we can't carry over any tags so continue to next loop.
  //       case "deleted":
  //       case "new":
  //         continue;
  //
  //       case "modified":
  //         filePathInLastAnalyzedCommit = diffAgainstLastAnalyzedCommit.currentFilePath;
  //         break;
  //
  //       // TS bug forcing me to do default instead of "renamed" even though it detects this is the only other case...
  //       default:
  //         filePathInLastAnalyzedCommit = diffAgainstLastAnalyzedCommit.previousFilePath;
  //         break;
  //     }
  //
  //     // There were no tags in the file in the last analyzed commit...
  //     if (lastAnalyzedTagsPerFile[filePathInLastAnalyzedCommit] === undefined) {
  //       continue;
  //     }
  //
  //     const { rejected, approved, all } = lastAnalyzedTagsPerFile[filePathInLastAnalyzedCommit];
  //
  //     // No tags to carry over.
  //     if (rejected.length === 0 && approved.length === 0 ) {
  //       continue;
  //     }
  //
  //     // Otherwise there may be tags to carry over if they were not altered across the diff.
  //     const tagLinks = Review.getTagLinksBetweenSomeTags(all, newTags, diffAgainstLastAnalyzedCommit.alteredLines);
  //
  //     for (let index = 0; index < tagLinks.length; index++ ) {
  //
  //       const tagLink = tagLinks[index];
  //
  //       if (tagLink === null) {
  //         continue;
  //       }
  //
  //       const tagPair: R.KeyValuePair<Review.TagWithMetadata, Review.TagWithMetadata> =
  //         [ all[index], newTags[tagLink] ];
  //
  //       const tagPairUpdated =
  //         R.any(Review.alteredLineInTagPairOwnership(tagPair), diffAgainstLastAnalyzedCommit.alteredLines)
  //
  //       // It has been altered so it must be reapproved/rerejected
  //       if (tagPairUpdated) { continue; }
  //
  //       // It has not been altered, carry over previous approve/reject status
  //       const [ previousTag, newTag ] = tagPair as [ Review.TagWithMetadata, Review.TagWithMetadata ]
  //
  //       if (R.contains(previousTag.tagId.toString(), approved)) {
  //         carryOverApprovedTags.push(newTag.tagId.toString());
  //         continue;
  //       }
  //
  //       if (R.contains(previousTag.tagId.toString(), rejected)) {
  //         carryOverRejectedTags.push(newTag.tagId.toString());
  //         continue;
  //       }
  //
  //     }
  //
  //   }
  // }
  //
  // const ownerNeededToApproveDocsPreviously = (owner: string) => {
  //   return R.contains(owner, lastAnalyzedCommitReview.remainingOwnersToApproveDocs);
  // }
  //
  // const allTagsApproved = (tagsAndOwners: Review.TagAndOwner[], owner: string, approvedTags: string[]): boolean => {
  //
  //   return R.all((tagAndOwner) => {
  //
  //     if (tagAndOwner.owner === owner) {
  //       return R.contains(tagAndOwner.tagId, approvedTags);
  //     }
  //
  //     return true;
  //   }, tagsAndOwners);
  // }
  //
  // const newTagsAndOwners = Review.getListOfTagsAndOwners(fileReviewsAgainstLastSuccess);
  // const allNewOwners = Review.getAllOwners(fileReviewsAgainstLastSuccess);
  //
  //
  // const remainingOwnersToApproveDocs = R.filter((owner) => {
  //   return ownerNeededToApproveDocsPreviously(owner) || !allTagsApproved(newTagsAndOwners, owner, carryOverApprovedTags)
  // }, allNewOwners);
  //
  // return {
  //   approvedTags: carryOverApprovedTags,
  //   rejectedTags: carryOverRejectedTags,
  //   remainingOwnersToApproveDocs,
  // };



type CommitHashMap<T> = {
  [commitId: string]: CommitHashMapValue<T>
}


type CommitHashMapValue<T> = {
  parentCommitIds: string[],
  metadata: T
}


const getCommitHashMap = <T>(pullRequestCommits: GH.PullRequestCommits, initMetadata: T): CommitHashMap<T> => {

  let commitHashMap: CommitHashMap<T> = { };

  for (let commit of pullRequestCommits) {
    commitHashMap[commit.sha] = {
      parentCommitIds: R.map((parent) => { return parent.sha }, commit.parents),
      metadata: initMetadata
    }
  }

  return commitHashMap;
}


const hasParent = ( commitHashMapValue: CommitHashMapValue<any>, searchForParentWithId: string ): boolean => {
  return R.contains(searchForParentWithId, commitHashMapValue.parentCommitIds);
}


const copyCommitHashMapAndInitMetadata =
  <T>( commitHashMap: CommitHashMap<any>
      , initMetadata: T
      ): CommitHashMap<T> => {

  const newCommitHashMap: CommitHashMap<T> = { };

  for (let commitId in commitHashMap) {

    newCommitHashMap[commitId] = {
      parentCommitIds: R.clone(commitHashMap[commitId].parentCommitIds),
      metadata: initMetadata
    }
  }

  return newCommitHashMap;
}


type PossiblePath = string[] | "no-path";

const minPossiblePath = (path1: PossiblePath, path2: PossiblePath): PossiblePath => {
  if (path1 === "no-path") { return path2; }
  if (path2 === "no-path") { return path1; }

  return (path1.length < path2.length ? path1 : path2);
}


const getShortestPathToCommit =
  <T>( commitHashMap: CommitHashMap<T>
     , searchForCommitId: string
     , headCommitId: string
     ): string[] | "no-path" => {

  type SearchMetadata = { state: "not-calculated" } | { state: "no-path" } | { state: "found", path: string[] };

  const initSearchMetadata: SearchMetadata = { state: "not-calculated" };
  const searchCommitHashMap: CommitHashMap<SearchMetadata> = copyCommitHashMapAndInitMetadata(commitHashMap, initSearchMetadata);

  const go = (currentCommitId: string): PossiblePath => {

    const currentCommitSearchNode = searchCommitHashMap[currentCommitId];

    // Base case 1, non-existant
    if (currentCommitSearchNode === undefined) { return "no-path"; }

    // Base case 2, parent is the node we are searching for
    if (hasParent(currentCommitSearchNode, searchForCommitId)) {
      return [ currentCommitId ];
    }

    switch (currentCommitSearchNode.metadata.state) {

      case "no-path":
        return "no-path";

      case "found":
        return currentCommitSearchNode.metadata.path;

      case "not-calculated":

        const currentCommitParentIds = searchCommitHashMap[currentCommitId].parentCommitIds;
        let shortestPathFromParent: PossiblePath = "no-path";

        for (let parentId of currentCommitParentIds) {
          shortestPathFromParent = minPossiblePath(shortestPathFromParent, go(parentId));
        }

        if (shortestPathFromParent === "no-path") {
          currentCommitSearchNode.metadata = { state: "no-path" };
          return "no-path";
        }

        const path = [ currentCommitId, ...shortestPathFromParent ];
        currentCommitSearchNode.metadata = { state: "found", path };
        return path;
    }

  }

  return go(headCommitId);
}


// Returns:
// If: `analyzingCommitId` is in the pull request commits, then returns an object with:
//     - the last commit before `analyzingCommitId` with a success status or the base commit that the PR is against if
//       no intermediate commits with a success status exist.
//     - an intermediate commit that was analyzed between the returned `analysisBaseCommitId` and the
//       `analyzingCommitId` if one exists, otherwise `null`.
//
// Else: `null`. This means the `analyzingCommitId` is no longer in the PR so it must have been rebased before the
//       analysis got here. This is unlikely but possible.
//
// @THROWS only `GithubAppLoggableError` if it can't find the shortest path from the head commit to the pr BASE commit.
const getBaseAndLastAnalyzedCommit =
  ( installationId: number
  , pullRequestCommits: GH.PullRequestCommits
  , prBaseCommitId: string
  , analyzedCommits: string[]
  , analyzedCommitsWithSuccessStatus: string[]
  , analyzingCommitId: string
  ) : F.Maybe<{ analysisBaseCommitId: string, intermediateAnalyzedCommitId: F.Maybe<string> }> => {

  const commitHashMap = getCommitHashMap(pullRequestCommits, null);

  if (commitHashMap[analyzingCommitId] === undefined) { return null; }

  const shortestPathToPrBaseCommit = getShortestPathToCommit(commitHashMap, prBaseCommitId, analyzingCommitId);

  if (shortestPathToPrBaseCommit === "no-path") {
    const calculateShortestPathLoggableError: AppError.GithubAppLoggableError = {
      errorName: "calculate-shortest-path-failure",
      githubAppError: true,
      loggable: true,
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: {
        pullRequestCommits,
        prBaseCommitId,
        analyzingCommitId
      }
    };

    throw calculateShortestPathLoggableError;
  }

  console.log(`Shortest path: ${JSON.stringify(shortestPathToPrBaseCommit)}`);

  let successCommitAfterPrBaseCommit: F.Maybe<string> = null;
  let intermediateAnalyzedCommitId: F.Maybe<string> = null;

  for (let commit of shortestPathToPrBaseCommit) {
    if (R.contains(commit, analyzedCommitsWithSuccessStatus)) {
      successCommitAfterPrBaseCommit = commit;
      break;
    }
  }

  const analysisBaseCommitId =
    successCommitAfterPrBaseCommit === null ? prBaseCommitId : successCommitAfterPrBaseCommit;


  for (let i = analyzedCommits.length - 1; i >= 0; i--) {
    const analyzedCommitId = analyzedCommits[i];

    if (commitHashMap[analyzedCommitId] !== undefined && analyzedCommitId !== analysisBaseCommitId) {

      if (getShortestPathToCommit(commitHashMap, analyzedCommitId, analysisBaseCommitId) === "no-path") {
        intermediateAnalyzedCommitId = analyzedCommitId;
        break;
      }

      break;
    }
  }

  console.log(`Analysis base commit: ${analysisBaseCommitId}`);
  console.log(`Analysis interm commit: ${intermediateAnalyzedCommitId}`);

  return {
    analysisBaseCommitId,
    intermediateAnalyzedCommitId
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

  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0].head;

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
