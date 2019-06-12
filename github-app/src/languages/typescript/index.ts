import * as JS from "../javascript";
import * as AST from "../ast";


// Because typescript has identical comments, we can just snag the JS parsers.
export const parse = JS.parse

export const astToTags = AST.standardTagsFromReducedFileAst
