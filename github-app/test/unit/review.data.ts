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
  ],
  [
    "Add code on lines right above and below tag",
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
            "const a = 6"
          ]
        }
      ],
      [
        {
          "tagType": "line",
          "owner": "amilner42",
          "startLine": 2,
          "endLine": 3,
          "tagAnnotationLine": 2,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "type": "added",
          "previousLineNumber": 1,
          "currentLineNumber": 1,
          "content": "here"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 4,
          "content": "here"
        }
      ]
    ],
    []
  ],
  [
    "Delete code on lines above and below tag ownership",
    [
      [
        {
          "tagType": "line",
          "owner": "amilner42",
          "startLine": 2,
          "endLine": 3,
          "tagAnnotationLine": 2,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
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
          "previousLineNumber": 1,
          "currentLineNumber": 1,
          "content": "here"
        },
        {
          "type": "deleted",
          "previousLineNumber": 4,
          "currentLineNumber": 3,
          "content": "here"
        }
      ]
    ],
    []
  ],
  [
    "Add new tag",
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
            "const a = 6"
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
        },
        {
          "tagType": "block",
          "startLine": 4,
          "endLine": 12,
          "owner": "username",
          "tagAnnotationLine": 5,
          "content": [
            "/*",
            "@VD username block ",
            "*/",
            "1",
            "2",
            "3",
            "4",
            "5",
            "// @VD end-block"
          ]
        }
      ],
      [
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 3,
          "content": ""
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 4,
          "content": "/*"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 5,
          "content": "@VD username block "
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 6,
          "content": "*/"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 7,
          "content": "1"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 8,
          "content": "2"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 9,
          "content": "3"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 10,
          "content": "4"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 11,
          "content": "5"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 12,
          "content": "// @VD end-block"
        }
      ]
    ],
    [
      {
        "reviewType": "new",
        "tag": {
          "content": [
            "/*",
            "@VD username block ",
            "*/",
            "1",
            "2",
            "3",
            "4",
            "5",
            "// @VD end-block"
          ],
          "endLine": 12,
          "owner": "username",
          "startLine": 4,
          "tagAnnotationLine": 5,
          "tagType": "block"
        }
      }
    ]
  ],
  [
    "Delete some tags",
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
            "const a = 6"
          ]
        },
        {
          "tagType": "block",
          "startLine": 4,
          "endLine": 12,
          "owner": "username",
          "tagAnnotationLine": 5,
          "content": [
            "/*",
            "@VD username block ",
            "*/",
            "1",
            "2",
            "3",
            "4",
            "5",
            "// @VD end-block"
          ]
        }
      ],
      [],
      [
        {
          "type": "deleted",
          "previousLineNumber": 1,
          "currentLineNumber": 0,
          "content": "// @VD amilner42 line"
        },
        {
          "type": "deleted",
          "previousLineNumber": 2,
          "currentLineNumber": 0,
          "content": "const a = 6"
        },
        {
          "type": "deleted",
          "previousLineNumber": 3,
          "currentLineNumber": 0,
          "content": ""
        },
        {
          "type": "deleted",
          "previousLineNumber": 4,
          "currentLineNumber": 0,
          "content": "/*"
        },
        {
          "type": "deleted",
          "previousLineNumber": 5,
          "currentLineNumber": 0,
          "content": "@VD username block "
        },
        {
          "type": "deleted",
          "previousLineNumber": 6,
          "currentLineNumber": 0,
          "content": "*/"
        },
        {
          "type": "deleted",
          "previousLineNumber": 7,
          "currentLineNumber": 0,
          "content": "1"
        },
        {
          "type": "deleted",
          "previousLineNumber": 8,
          "currentLineNumber": 0,
          "content": "2"
        },
        {
          "type": "deleted",
          "previousLineNumber": 9,
          "currentLineNumber": 0,
          "content": "3"
        },
        {
          "type": "deleted",
          "previousLineNumber": 10,
          "currentLineNumber": 0,
          "content": "4"
        },
        {
          "type": "deleted",
          "previousLineNumber": 11,
          "currentLineNumber": 0,
          "content": "5"
        },
        {
          "type": "deleted",
          "previousLineNumber": 12,
          "currentLineNumber": 0,
          "content": "// @VD end-block"
        }
      ]
    ],
    [
      {
        "reviewType": "deleted",
        "tag": {
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ],
          "endLine": 2,
          "owner": "amilner42",
          "startLine": 1,
          "tagAnnotationLine": 1,
          "tagType": "line"
        }
      },
      {
        "reviewType": "deleted",
        "tag": {
          "content": [
            "/*",
            "@VD username block ",
            "*/",
            "1",
            "2",
            "3",
            "4",
            "5",
            "// @VD end-block"
          ],
          "endLine": 12,
          "owner": "username",
          "startLine": 4,
          "tagAnnotationLine": 5,
          "tagType": "block"
        }
      }
    ]
  ]
]
