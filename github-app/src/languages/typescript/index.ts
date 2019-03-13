// Module for typescript-specific parsing functionality

import * as LangUtil from "../util";
import * as Lang from "../index"

/** Parse the FileAst from the given file content. */
export const parse = (fileContent: string): Lang.FileAst => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = LangUtil.standardTagsFromReducedFileAst
