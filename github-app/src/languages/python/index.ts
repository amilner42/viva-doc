// Module for python-specific parsing functionality

import * as AST from "../ast"
import * as Tag from "../../tag"


export const parse = (fileContent: string): AST.ReducedFileAst => {
  throw new Error("NOT IMPLEMENTED")
}


export const astToTags = (fileAst: AST.ReducedFileAst, fileContent: string): Tag.VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
