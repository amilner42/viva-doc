// Module for javascript-specific parsing functionality

import * as AST from "../ast"
import * as GenericCommentParser from "../generic-comment-parser"

import { JavaLexer } from "./JavaLexer"
import { JavaParser } from "./JavaParser"


export const parse = GenericCommentParser.createCommentParser(JavaLexer, JavaParser);

export const astToTags = AST.standardTagsFromReducedFileAst;
