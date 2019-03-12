import * as Lang from "../../../src/analysis/languages"
import * as Tag from "../../../src/analysis/tag-parser"

type DescribeTable = [ string, TestTable ][]

// `null` for expected implies that an error should be thrown, when we refine our errors you can refine it here too.
type TestTable = [ string, Lang.Language, string, null | Tag.VdTag[] ][]

/** Tests for valid files */

const JAVASCRIPT_MANY_TAGS_TEXT = `// @VD amilner42 line
const a = 5;

// @VD amilner42 function
export const func = () => {
  ...
  ...
  // @VD amilner42 block
  a = 2
  b = 3
  // @VD end-block
  ...
}
`

const VALID_JAVASCRIPT_TESTS: TestTable = [
  [
    "Blank file",
    "Javascript",
    "",
    []
  ],
  [
    "Javascript file with many tags",
    "Javascript",
    JAVASCRIPT_MANY_TAGS_TEXT,
    [
      {
        "content": [
          "// @VD amilner42 line",
          "const a = 5;"
        ],
        "endLine": 2,
        "owner": "amilner42",
        "startLine": 1,
        "tagAnnotationLine": 1,
        "tagType": "line"
      },
      {
        "content": [
          "// @VD amilner42 function",
          "export const func = () => {",
          "  ...",
          "  ...",
          "  // @VD amilner42 block",
          "  a = 2",
          "  b = 3",
          "  // @VD end-block",
          "  ...",
          "}"
        ],
        "endLine": 13,
        "owner": "amilner42",
        "startLine": 4,
        "tagAnnotationLine": 4,
        "tagType": "function"
      },
      {
        "content": [
          "  // @VD amilner42 block",
          "  a = 2",
          "  b = 3",
          "  // @VD end-block"
        ],
        "endLine": 11,
        "owner": "amilner42",
        "startLine": 8,
        "tagAnnotationLine": 8,
        "tagType": "block"
      }
    ]
  ]
]

// Valid tests for all languages.
const VALID_FILE_TESTS: TestTable = VALID_JAVASCRIPT_TESTS

/** Tests for invalid files */

const JAVASCRIPT_FUNCTION_TAG_WITH_NO_FUNCTION_TEXT = `const a = 5;

// bla

/* @VD amilner42 function */
const j = 10
`

const INVALID_JAVASCRIPT_TESTS: TestTable = [
  [
    "Invalid JS with unclosed parens",
    "Javascript",
    "(",
    null
  ],
  [
    "Invalid @VD block tag - no end-block",
    "Javascript",
    `// @VD amilner42 block
    const a = 5
    `,
    null
  ],
  [
    "Invalid random @VD annotation without username and tag type",
    "Javascript",
    "// @VD ",
    null
  ],
  [
    "Invalid @VD annotation with improper tag type banana",
    "Javascript",
    "// @VD amilner42 banana ",
    null
  ],
  [
    "Invalid @VD annotation with improper tag type lines",
    "Javascript",
    "// @VD amilner42 lines ",
    null
  ],
  [
    "Invalid @VD function annotation due to no function",
    "Javascript",
    JAVASCRIPT_FUNCTION_TAG_WITH_NO_FUNCTION_TEXT,
    null
  ],
  [
    "Invalid @VD line annotation on the last line",
    "Javascript",
    "/* @VD amilner42 line */",
    null
  ]
]

/** Invalid tests for all languages. */
const INVALID_FILE_TESTS: TestTable = INVALID_JAVASCRIPT_TESTS

/** The describe table for generating a bunch of tests. */
export const TESTS: DescribeTable = [
  [
    "Valid files",
    VALID_FILE_TESTS
  ],
  [
    "Invalid files",
    INVALID_FILE_TESTS
  ]
]
