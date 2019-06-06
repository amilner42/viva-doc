import * as Review from "../../src/review"
import * as ReviewData from "./review.data"

describe("calculateReviewsFromModification", () => {
  test.each(ReviewData.CALCULATE_REVIEWS_FROM_MODIFICATION_TESTS)("%s",
    (name, [ previousTags, currentTags, alteredLines ], expected) => {
      expect(Review.calculateReviewsFromModification(previousTags, currentTags, alteredLines)).toEqual(expected)
    }
  )
})
