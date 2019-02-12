// Module for python-specific parsing functionality

import { FileAST, ReducedFileAST } from "../index"
import { VdTag } from "../../tag-parser"

/** Parse the FileAST from the given file content. */
export const parse = (fileContent: string): FileAST => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = (fileAst: ReducedFileAST): VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
