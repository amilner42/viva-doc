// Generated from ./JavascriptParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { ProgramContext } from "./JavascriptParser";
import { SourceElementsContext } from "./JavascriptParser";
import { SourceElementContext } from "./JavascriptParser";
import { MultiLineCommentContext } from "./JavascriptParser";
import { SingleLineCommentContext } from "./JavascriptParser";
import { FunctionDeclarationContext } from "./JavascriptParser";
import { FunctionParamsContext } from "./JavascriptParser";
import { FunctionParamContext } from "./JavascriptParser";
import { ParenPairContext } from "./JavascriptParser";
import { BracePairContext } from "./JavascriptParser";
import { ParenPairInFunctionParamContext } from "./JavascriptParser";
import { BracePairInFunctionParamContext } from "./JavascriptParser";


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
	 * Enter a parse tree produced by `JavascriptParser.multiLineComment`.
	 * @param ctx the parse tree
	 */
	enterMultiLineComment?: (ctx: MultiLineCommentContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.multiLineComment`.
	 * @param ctx the parse tree
	 */
	exitMultiLineComment?: (ctx: MultiLineCommentContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.singleLineComment`.
	 * @param ctx the parse tree
	 */
	enterSingleLineComment?: (ctx: SingleLineCommentContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.singleLineComment`.
	 * @param ctx the parse tree
	 */
	exitSingleLineComment?: (ctx: SingleLineCommentContext) => void;

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
	 * Enter a parse tree produced by `JavascriptParser.functionParams`.
	 * @param ctx the parse tree
	 */
	enterFunctionParams?: (ctx: FunctionParamsContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.functionParams`.
	 * @param ctx the parse tree
	 */
	exitFunctionParams?: (ctx: FunctionParamsContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.functionParam`.
	 * @param ctx the parse tree
	 */
	enterFunctionParam?: (ctx: FunctionParamContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.functionParam`.
	 * @param ctx the parse tree
	 */
	exitFunctionParam?: (ctx: FunctionParamContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.parenPair`.
	 * @param ctx the parse tree
	 */
	enterParenPair?: (ctx: ParenPairContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.parenPair`.
	 * @param ctx the parse tree
	 */
	exitParenPair?: (ctx: ParenPairContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.bracePair`.
	 * @param ctx the parse tree
	 */
	enterBracePair?: (ctx: BracePairContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.bracePair`.
	 * @param ctx the parse tree
	 */
	exitBracePair?: (ctx: BracePairContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.parenPairInFunctionParam`.
	 * @param ctx the parse tree
	 */
	enterParenPairInFunctionParam?: (ctx: ParenPairInFunctionParamContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.parenPairInFunctionParam`.
	 * @param ctx the parse tree
	 */
	exitParenPairInFunctionParam?: (ctx: ParenPairInFunctionParamContext) => void;

	/**
	 * Enter a parse tree produced by `JavascriptParser.bracePairInFunctionParam`.
	 * @param ctx the parse tree
	 */
	enterBracePairInFunctionParam?: (ctx: BracePairInFunctionParamContext) => void;
	/**
	 * Exit a parse tree produced by `JavascriptParser.bracePairInFunctionParam`.
	 * @param ctx the parse tree
	 */
	exitBracePairInFunctionParam?: (ctx: BracePairInFunctionParamContext) => void;
}

