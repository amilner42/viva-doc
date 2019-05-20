// Top level module for the analysis pipeline.

import R from "ramda"

import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as Lang from "./languages/index"
import * as AppError from "./error"

import mongoose from "mongoose"
const BranchReview = mongoose.model('BranchReview')
const BranchReviewMetadata = mongoose.model('BranchReviewMetadata')

/** EXTERNAL FUNCTIONS */

export const pipeline = async (
  repoId: string,
  repoFullName: string,
  branchName: string,
  finalCommitId: string,
  getBranchReviewUrl: () => string,
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>,
  setStatus: (statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>
) => {

  // TODO "base branch" should be the name of the base branch.
  await setStatus("pending", { description: "Analyzing documentation against base branch..." })

  const fileReviewsNeedingApproval = await getFileReviewsWithMetadataNeedingApproval(retrieveDiff, retrieveFiles)

  if (fileReviewsNeedingApproval.length === 0) {
    await setStatus("success", { description: "No tags require approval" })
    return
  }

  // TODO for prod handle errors
  const branchReview = new BranchReview({
    repoId,
    repoFullName,
    branchName,
    commitId: finalCommitId,
    fileReviews: fileReviewsNeedingApproval
  })

  const branchReviewMetadata = new BranchReviewMetadata({
    repoId,
    branchName,
    commitId: finalCommitId,
    approvedTags: [ ]
  })

  await branchReview.save()
  await branchReviewMetadata.save()
  await setStatus("failure", { description: "Tags require approval", target_url: getBranchReviewUrl() })
}

export const getFileReviewsWithMetadataNeedingApproval = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
): Promise<Review.FileReviewWithMetadata[]> => {

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff())

  // Keep only the languages we support
  const filesDiffsToAnalyze: Diff.FileDiff[] = R.filter(
    (fileDiff) => {
      try {
        // TODO does this make sense on with diffType = rename?
        Lang.extractFileType(fileDiff.currentFilePath)
        return true
      } catch ( err ) {
        if (err instanceof Lang.LanguageParserError) {
          switch (err.type) {

            case "unsupported-extension":
              return false;

            case "unsupported-file":
              return false;
          }

          // Otherwise propogate error
          throw err;
        }

        // Otherwise propogate error
        throw err;
      }
    },
    fileDiffs
  )

  // No files to analyze
  if (filesDiffsToAnalyze.length === 0) {
    return []
  }

  let fileDiffsWithCode: Tag.FileDiffWithCode[];

  // Fetch all files needed for analysis
  try {
    fileDiffsWithCode = await Promise.all(filesDiffsToAnalyze.map(async (fileDiff): Promise<Tag.FileDiffWithCode> => {

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

    }))

  } catch (err) {
    throw new AppError.ProbotAppError(`Failed to retrieve files: ${err} --- ${JSON.stringify(err)}`)
  }

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
