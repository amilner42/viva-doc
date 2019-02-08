// Module for javascript-specific parsing functionality

import { Maybe } from "../../functional-types"
import { FileParser } from "./index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { JavascriptLexer } from "../../grammars/JavascriptLexer"
import { JavascriptParser } from "../../grammars/JavascriptParser"
import { JavascriptParserListener } from "../../grammars/JavascriptParserListener"

const TEST_CODE = `function () { }

// Some comment
// Other comment

/** worked? */
`

// Create lexer and parser
let inputStream = new ANTLRInputStream(TEST_CODE);
let lexer = new JavascriptLexer(inputStream);
let tokenStream = new CommonTokenStream(lexer as any);
let parser = new JavascriptParser(tokenStream);
let result = parser.program() // Parse our program

// Print children for testing
if (result.children === undefined) {
  throw new Error("no children??")
}
result.children.map((x) => {
  for(let i = 0; i < x.childCount; i++) {
    console.log(`[Parser] ${x.getChild(i).text}`)
  }
})


// The FileParser for a javascript file.
export const fileParser: Maybe<FileParser> = null
