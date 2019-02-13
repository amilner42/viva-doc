// Module for java-specific parsing functionality

import { standardTagsFromReducedFileAst } from "../util";
import { FileAst } from "../index"

/** Parse the FileAst from the given file content. */
export const parse = (fileContent: string): FileAst => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = standardTagsFromReducedFileAst
