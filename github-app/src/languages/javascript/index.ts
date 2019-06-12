// Module for javascript-specific parsing functionality

import * as SH from "../../string-helpers"
import * as AST from "../ast"
import * as LangUtil from "../util"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts'
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser, SingleLineCommentContext, MultiLineCommentContext } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"


export const parse = (fileContent: string): AST.ReducedFileAst => {

  // Create lexer and parser
  const inputStream = new ANTLRInputStream(fileContent)
  const lexer = new JavascriptLexer(inputStream)
  const tokenStream = new CommonTokenStream(lexer)
  const parser = new JavascriptParser(tokenStream)
  parser.errorHandler = new LangUtil.ErrorHappenedStrategy()
  const parseTree = parser.program()
  const listener = new ExtractCommentsAndFunctionsListener();

  if((parser.errorHandler as LangUtil.ErrorHappenedStrategy).hasError) {
    throw new Error("TODO - Parser error handler?")
  }

  // Visit the parse tree
  ParseTreeWalker.DEFAULT.walk(listener as JavascriptParserListener, parseTree)

  const fileAst: AST.FileAst = AST.getFileAstFromRawFileAst(listener.rawFileAst);
  const reducedFileAst = AST.getReducedFileAstFromFileAst(fileAst);

  return reducedFileAst;
}

export const astToTags = AST.standardTagsFromReducedFileAst;


/**
 * A listener which extracts a `AST.RawFileAst`.
 */
class ExtractCommentsAndFunctionsListener implements JavascriptParserListener {

  public rawFileAst: AST.RawFileAst;

  constructor() {
    this.rawFileAst = AST.newEmptyRawFileAst()
  }

  enterSingleLineComment(ctx: SingleLineCommentContext) {
    if (ctx._start.text === undefined) {
        throw new Error("TODO - Single Line Comment Context Undefined")
    }

    const content = ctx._start.text
    AST.addSingleLineCommentToRawAst(
      this.rawFileAst,
      {
        content,
        startLine: ctx._start.line,
        endLine: ctx._start.line,
        indentIndex: ctx._start.charPositionInLine
      }
    );
  }

  enterMultiLineComment(ctx: MultiLineCommentContext) {
    if (ctx._start.text === undefined) {
      throw new Error("TODO - Multiline Comment Context Undefined")
    }

    const content = ctx._start.text
    AST.addMultilineCommentToRawAst(
      this.rawFileAst,
      {
        content,
        startLine: ctx._start.line,
        endLine: ctx._start.line + SH.getNumberOfLines(content) - 1
      }
    )
  }
}
