import * as TagData from "./tag-parser.data"
import * as Tag from "../../src/tag-parser"

// Currently just `Tags.getFileTags` is tested as that is the core functionality.
describe.each(TagData.TESTS)(
  "%s",
  (name, table) => {
    test.each(table)("%s", (name, language, content, expected) => {
      if (expected === null) {
        // Expects error
        expect(() => { return Tag.getFileTags(language, content) }).toThrowError()
      } else {
        // Expects result
        expect(Tag.getFileTags(language, content)).toEqual(expected)
      }
    })
  }
)
