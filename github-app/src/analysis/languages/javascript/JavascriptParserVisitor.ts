// Generated from ./JavascriptParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

import { ProgramContext } from "./JavascriptParser";
import { SourceElementsContext } from "./JavascriptParser";
import { SourceElementContext } from "./JavascriptParser";
import { FunctionDeclarationContext } from "./JavascriptParser";
import { FunctionParamsContext } from "./JavascriptParser";
import { FunctionParamContext } from "./JavascriptParser";
import { ParenPairContext } from "./JavascriptParser";
import { BracePairContext } from "./JavascriptParser";
import { ParenPairInFunctionParamContext } from "./JavascriptParser";
import { BracePairInFunctionParamContext } from "./JavascriptParser";


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
	 * Visit a parse tree produced by `JavascriptParser.functionDeclaration`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionDeclaration?: (ctx: FunctionDeclarationContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.functionParams`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionParams?: (ctx: FunctionParamsContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.functionParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionParam?: (ctx: FunctionParamContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.parenPair`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParenPair?: (ctx: ParenPairContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.bracePair`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBracePair?: (ctx: BracePairContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.parenPairInFunctionParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParenPairInFunctionParam?: (ctx: ParenPairInFunctionParamContext) => Result;

	/**
	 * Visit a parse tree produced by `JavascriptParser.bracePairInFunctionParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBracePairInFunctionParam?: (ctx: BracePairInFunctionParamContext) => Result;
}

