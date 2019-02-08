// Generated from ./JavascriptParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { ProgramContext } from "./JavascriptParser";
import { SourceElementsContext } from "./JavascriptParser";
import { SourceElementContext } from "./JavascriptParser";
import { FunctionDeclarationContext } from "./JavascriptParser";
import { IrrelevantContext } from "./JavascriptParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `JavascriptParser`.
 */
export interface JavascriptParserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `JavascriptParser.program`.
	 * @param ctx the parse tree
	 */
	enterProgram?: (ctx: ProgramContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.program`.
	 * @param ctx the parse tree
	 */
	exitProgram?: (ctx: ProgramContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.sourceElements`.
	 * @param ctx the parse tree
	 */
	enterSourceElements?: (ctx: SourceElementsContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.sourceElements`.
	 * @param ctx the parse tree
	 */
	exitSourceElements?: (ctx: SourceElementsContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.sourceElement`.
	 * @param ctx the parse tree
	 */
	enterSourceElement?: (ctx: SourceElementContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.sourceElement`.
	 * @param ctx the parse tree
	 */
	exitSourceElement?: (ctx: SourceElementContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.functionDeclaration`.
	 * @param ctx the parse tree
	 */
	enterFunctionDeclaration?: (ctx: FunctionDeclarationContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.functionDeclaration`.
	 * @param ctx the parse tree
	 */
	exitFunctionDeclaration?: (ctx: FunctionDeclarationContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.irrelevant`.
	 * @param ctx the parse tree
	 */
	enterIrrelevant?: (ctx: IrrelevantContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.irrelevant`.
	 * @param ctx the parse tree
	 */
	exitIrrelevant?: (ctx: IrrelevantContext) => void;
}

