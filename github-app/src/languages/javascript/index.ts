// Module for javascript-specific parsing functionality

import * as AST from "../ast"
import * as GenericCommentParser from "../generic-comment-parser"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser} from "./JavascriptParser"


export const parse = GenericCommentParser.createCommentParser(JavascriptLexer, JavascriptParser);

export const astToTags = AST.standardTagsFromReducedFileAst;
