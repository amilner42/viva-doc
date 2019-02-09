// Module for javascript-specific parsing functionality

import { Maybe } from "../../../functional-types"
import { FileParser } from "./../index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser, FunctionDeclarationContext, ProgramContext, SingleLineCommentContext, MultiLineCommentContext } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"

/**
 * A listener which returns the total number of methods declared in the parse tree.
 */
class ExtractCommentsAndFunctionsListener implements JavascriptParserListener {

    enterFunctionDeclaration(ctx: FunctionDeclarationContext) {
        console.log("entered function")
        console.log(ctx.payload.text)
    }

    enterSingleLineComment(ctx: SingleLineCommentContext) {
        console.log("entered single line comment")
        console.log(ctx.payload.text)
    }

    enterMultiLineComment(ctx: MultiLineCommentContext) {
        console.log("entered multiline comment")
        console.log(ctx.payload.text)
    }
}

const TEST_JS_CODE = `
// a comment

/** another comment */

function someFunc() {

    const nestedFunc = () => {

    }
}
`

// TODO
// Create lexer and parser
let inputStream = new ANTLRInputStream(TEST_JS_CODE);
let lexer = new JavascriptLexer(inputStream);
let tokenStream = new CommonTokenStream(lexer);
let parser = new JavascriptParser(tokenStream);
let parseTree: ProgramContext = parser.program(); // Parse our program
const listener: JavascriptParserListener = new ExtractCommentsAndFunctionsListener();

// Visit the parse tree
ParseTreeWalker.DEFAULT.walk(listener, parseTree)

// The FileParser for a javascript file.
export const fileParser: Maybe<FileParser> = null
