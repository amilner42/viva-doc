// Module for javascript-specific parsing functionality

import {  ErrorHappenedStrategy, standardTagsFromReducedFileAst  } from "../util"
import { FileAst, newEmptyFileAst, addFunctionToAst, addCommentToAst } from "../index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts'
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser, FunctionDeclarationContext, ProgramContext, SingleLineCommentContext, MultiLineCommentContext } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"

/**
 * A listener which returns the total number of methods declared in the parse tree.
 */
class ExtractCommentsAndFunctionsListener implements JavascriptParserListener {

  public fileAst: FileAst;

  constructor() {
    this.fileAst = newEmptyFileAst()
  }

  enterFunctionDeclaration(ctx: FunctionDeclarationContext) {
    if (ctx._stop === undefined) {
        throw new Error("TODO")
    }

    addFunctionToAst(this.fileAst, { startLine: ctx._start.line, endLine: ctx._stop.line })
  }

  enterSingleLineComment(ctx: SingleLineCommentContext) {
    if (ctx._start.text === undefined) {
        throw new Error("TODO")
    }

    const content = ctx._start.text
    addCommentToAst(this.fileAst, { content, startLine: ctx._start.line, endLine: ctx._start.line })
  }

  enterMultiLineComment(ctx: MultiLineCommentContext) {
    if (ctx._start.text === undefined) {
      throw new Error("TODO")
    }

    const content = ctx._start.text
    addCommentToAst(
      this.fileAst,
      {
        content,
        startLine: ctx._start.line,
        endLine: ctx._start.line + this.getLines(content)
      }
    )
  }

  // TODO BUG line might not be split by \n??
  private getLines(content: string): number {
    return content.split("\n").length - 1
  }
}

export const parse = (fileContent: string): FileAst => {

  // Create lexer and parser
  const inputStream = new ANTLRInputStream(fileContent)
  const lexer = new JavascriptLexer(inputStream)
  const tokenStream = new CommonTokenStream(lexer)
  const parser = new JavascriptParser(tokenStream)
  parser.errorHandler = new ErrorHappenedStrategy()
  const parseTree = parser.program()
  const listener = new ExtractCommentsAndFunctionsListener();

  if((parser.errorHandler as ErrorHappenedStrategy).hasError) {
    throw new Error("TODO")
  }

  // Visit the parse tree
  ParseTreeWalker.DEFAULT.walk(listener as JavascriptParserListener, parseTree)

  return listener.fileAst
}

export const astToTags = standardTagsFromReducedFileAst
