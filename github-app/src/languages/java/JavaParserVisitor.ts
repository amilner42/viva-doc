// Generated from ./JavaParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

import { ProgramContext } from "./JavaParser";
import { SourceElementsContext } from "./JavaParser";
import { SourceElementContext } from "./JavaParser";
import { MultiLineCommentContext } from "./JavaParser";
import { SingleLineCommentContext } from "./JavaParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `JavaParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface JavaParserVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `JavaParser.program`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitProgram?: (ctx: ProgramContext) => Result;

	/**
	 * Visit a parse tree produced by `JavaParser.sourceElements`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElements?: (ctx: SourceElementsContext) => Result;

	/**
	 * Visit a parse tree produced by `JavaParser.sourceElement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElement?: (ctx: SourceElementContext) => Result;

	/**
	 * Visit a parse tree produced by `JavaParser.multiLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMultiLineComment?: (ctx: MultiLineCommentContext) => Result;

	/**
	 * Visit a parse tree produced by `JavaParser.singleLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSingleLineComment?: (ctx: SingleLineCommentContext) => Result;
}

