// Module for typescript-specific parsing functionality

import * as AST from "../ast"


/** Parse the FileAst from the given file content. */
export const parse = (fileContent: string): AST.ReducedFileAst => {
  throw new Error("NOT IMPLEMENTED")
}


export const astToTags = AST.standardTagsFromReducedFileAst
