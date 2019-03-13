import * as Diff from "../../src/diff-parser"
import * as DiffData from "./diff-parser.data"

describe.each(DiffData.TESTS)(
  "%s",
  (name, table) => {
    test.each(table)("%s", (name, text, expected) => {
      expect(Diff.parseDiff(text)).toEqual(expected)
    })
  }
)
