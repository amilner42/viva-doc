// Module for python-specific parsing functionality

import { FileAst, ReducedFileAst } from "../index"
import { VdTag } from "../../tag-parser"

/** Parse the FileAst from the given file content. */
export const parse = (fileContent: string): FileAst => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = (fileAst: ReducedFileAst): VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
