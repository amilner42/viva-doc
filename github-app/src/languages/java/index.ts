// Module for java-specific parsing functionality

import * as AST from "../ast"


export const parse = (fileContent: string): AST.ReducedFileAst => {
  throw new Error("NOT IMPLEMENTED")
}

export const astToTags = AST.standardTagsFromReducedFileAst
