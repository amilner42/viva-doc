// Module for cplusplus-specific parsing functionality

import { standardTagsFromReducedFileAst } from "../util"
import { FileAST } from "../index"

/** Parse the FileAST from the given file content. */
export const parse = (fileContent: string): FileAST => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = standardTagsFromReducedFileAst
