// Module for python-specific parsing functionality

import * as Lang from "../index"
import * as Tag from "../../tag-parser"

/** Parse the FileAst from the given file content. */
export const parse = (fileContent: string): Lang.FileAst => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = (fileAst: Lang.ReducedFileAst): Tag.VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
