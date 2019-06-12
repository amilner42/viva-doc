// Generated from ./JavascriptParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

import { ProgramContext } from "./JavascriptParser";
import { SourceElementsContext } from "./JavascriptParser";
import { SourceElementContext } from "./JavascriptParser";
import { MultiLineCommentContext } from "./JavascriptParser";
import { SingleLineCommentContext } from "./JavascriptParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `JavascriptParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface JavascriptParserVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `JavascriptParser.program`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitProgram?: (ctx: ProgramContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.sourceElements`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElements?: (ctx: SourceElementsContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.sourceElement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElement?: (ctx: SourceElementContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.multiLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMultiLineComment?: (ctx: MultiLineCommentContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.singleLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSingleLineComment?: (ctx: SingleLineCommentContext) => Result;
}

