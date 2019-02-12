// Module for python-specific parsing functionality

import { FileAST } from "../index"
import { VdTag } from "../../tag-parser"

/** Parse the FileAST from the given file content. */
export const parse = (fileContent: string): FileAST => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = (fileAst: FileAST): VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
