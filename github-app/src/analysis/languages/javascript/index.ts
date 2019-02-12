// Module for javascript-specific parsing functionality

import {  ErrorHappenedStrategy, standardTagsFromFileAst  } from "../util"
import { FileAST, newEmptyFileAst } from "../index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts'
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser, FunctionDeclarationContext, ProgramContext, SingleLineCommentContext, MultiLineCommentContext } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"

/**
 * A listener which returns the total number of methods declared in the parse tree.
 */
class ExtractCommentsAndFunctionsListener implements JavascriptParserListener {

  public fileAst: FileAST;

  constructor() {
    this.fileAst = newEmptyFileAst()
  }

  enterFunctionDeclaration(ctx: FunctionDeclarationContext) {
      if(ctx._stop === undefined) {
          throw new Error("TODO")
      }

      this.fileAst.functions.push({
        fromLine: ctx._start.line,
        toLine: ctx._stop.line
      })
  }

  enterSingleLineComment(ctx: SingleLineCommentContext) {
      if(ctx._stop === undefined) {
          throw new Error("TODO")
      }

      this.fileAst.comments.push({
        content: "TODO",
        fromLine: ctx._start.line,
        toLine: ctx._stop.line
      })

      console.log(`Text: ${ctx.text}`)
  }

  enterMultiLineComment(ctx: MultiLineCommentContext) {
      if(ctx._stop === undefined) {
          throw new Error("TODO")
      }

      this.fileAst.comments.push({
        content: "TODO",
        fromLine: ctx._start.line,
        toLine: ctx._stop.line
      })

      console.log(`Text: ${ctx.text}`)
  }
}

export const parse = (fileContent: string): FileAST => {

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

export const astToTags = standardTagsFromFileAst
