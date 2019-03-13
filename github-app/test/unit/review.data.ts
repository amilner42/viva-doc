import * as Diff from "../../src/diff"
import * as Review from "../../src/review"
import * as Tag from "../../src/tag"

type CalculateReviewsTestTable = [ string, [Tag.VdTag[], Tag.VdTag[], Diff.AlteredLine[]], Review.Review[] ][]

export const CALCULATE_REVIEWS_FROM_MODIFICATION_TESTS: CalculateReviewsTestTable = [
  [
    "Modify code for line annotation",
    [
      [
        {
          "tagType": "line",
          "owner": "amilner42",
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 5"
          ]
        }
      ],
      [
        {
          "tagType": "line",
          "owner": "amilner42",
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "type": "deleted",
          "previousLineNumber": 2,
          "currentLineNumber": 2,
          "content": "const a = 5"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 2,
          "content": "const a = 6"
        }
      ]
    ],
    [ {
        reviewType: "modified",
        tag: {
          "tagType": "line",
          "owner": "amilner42",
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        },
        alteredLines: [
          {
            "type": "deleted",
            "previousLineNumber": 2,
            "currentLineNumber": 2,
            "content": "const a = 5"
          },
          {
            "type": "added",
            "previousLineNumber": 3,
            "currentLineNumber": 2,
            "content": "const a = 6"
          }
        ]
      }
    ]
  ]
]
