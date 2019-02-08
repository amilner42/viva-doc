// Module for javascript-specific parsing functionality

import { Maybe } from "../../../functional-types"
import { FileParser } from "./../index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"

// TODO
// Create lexer and parser
let inputStream = new ANTLRInputStream("");
let lexer = new JavascriptLexer(inputStream);
let tokenStream = new CommonTokenStream(lexer as any);
let parser = new JavascriptParser(tokenStream);
let result = parser.program() // Parse our program

// The FileParser for a javascript file.
export const fileParser: Maybe<FileParser> = null
