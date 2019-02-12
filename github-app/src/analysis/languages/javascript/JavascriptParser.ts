// Generated from ./JavascriptParser.g4 by ANTLR 4.6-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { FailedPredicateException } from "antlr4ts/FailedPredicateException";
import { NotNull } from "antlr4ts/Decorators";
import { NoViableAltException } from "antlr4ts/NoViableAltException";
import { Override } from "antlr4ts/Decorators";
import { Parser } from "antlr4ts/Parser";
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { ParserATNSimulator } from "antlr4ts/atn/ParserATNSimulator";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { RecognitionException } from "antlr4ts/RecognitionException";
import { RuleContext } from "antlr4ts/RuleContext";
//import { RuleVersion } from "antlr4ts/RuleVersion";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { Token } from "antlr4ts/Token";
import { TokenStream } from "antlr4ts/TokenStream";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";

import { JavascriptParserListener } from "./JavascriptParserListener";
import { JavascriptParserVisitor } from "./JavascriptParserVisitor";


export class JavascriptParser extends Parser {
	public static readonly MultiLineComment = 1;
	public static readonly SingleLineComment = 2;
	public static readonly OpenParen = 3;
	public static readonly CloseParen = 4;
	public static readonly OpenBrace = 5;
	public static readonly CloseBrace = 6;
	public static readonly Arrow = 7;
	public static readonly Function = 8;
	public static readonly Identifier = 9;
	public static readonly RegularExpressionLiteral = 10;
	public static readonly StringLiteral = 11;
	public static readonly TemplateStringLiteral = 12;
	public static readonly WhiteSpaces = 13;
	public static readonly LineTerminator = 14;
	public static readonly IrrelevantChar = 15;
	public static readonly RULE_program = 0;
	public static readonly RULE_sourceElements = 1;
	public static readonly RULE_sourceElement = 2;
	public static readonly RULE_multiLineComment = 3;
	public static readonly RULE_singleLineComment = 4;
	public static readonly RULE_functionDeclaration = 5;
	public static readonly RULE_functionParams = 6;
	public static readonly RULE_functionParam = 7;
	public static readonly RULE_parenPair = 8;
	public static readonly RULE_bracePair = 9;
	public static readonly RULE_parenPairInFunctionParam = 10;
	public static readonly RULE_bracePairInFunctionParam = 11;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"program", "sourceElements", "sourceElement", "multiLineComment", "singleLineComment", 
		"functionDeclaration", "functionParams", "functionParam", "parenPair", 
		"bracePair", "parenPairInFunctionParam", "bracePairInFunctionParam",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, "'('", "')'", "'{'", "'}'", "'=>'", "'function'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "MultiLineComment", "SingleLineComment", "OpenParen", "CloseParen", 
		"OpenBrace", "CloseBrace", "Arrow", "Function", "Identifier", "RegularExpressionLiteral", 
		"StringLiteral", "TemplateStringLiteral", "WhiteSpaces", "LineTerminator", 
		"IrrelevantChar",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(JavascriptParser._LITERAL_NAMES, JavascriptParser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return JavascriptParser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "JavascriptParser.g4"; }

	// @Override
	public get ruleNames(): string[] { return JavascriptParser.ruleNames; }

	// @Override
	public get serializedATN(): string { return JavascriptParser._serializedATN; }

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(JavascriptParser._ATN, this);
	}
	// @RuleVersion(0)
	public program(): ProgramContext {
		let _localctx: ProgramContext = new ProgramContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, JavascriptParser.RULE_program);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 25;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0)) {
				{
				this.state = 24;
				this.sourceElements();
				}
			}

			this.state = 27;
			this.match(JavascriptParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sourceElements(): SourceElementsContext {
		let _localctx: SourceElementsContext = new SourceElementsContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, JavascriptParser.RULE_sourceElements);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 30;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 29;
				this.sourceElement();
				}
				}
				this.state = 32;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0));
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sourceElement(): SourceElementContext {
		let _localctx: SourceElementContext = new SourceElementContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, JavascriptParser.RULE_sourceElement);
		try {
			this.state = 40;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 2, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 34;
				this.multiLineComment();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 35;
				this.singleLineComment();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 36;
				this.match(JavascriptParser.Identifier);
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 37;
				this.functionDeclaration();
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 38;
				this.parenPair();
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 39;
				this.bracePair();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public multiLineComment(): MultiLineCommentContext {
		let _localctx: MultiLineCommentContext = new MultiLineCommentContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, JavascriptParser.RULE_multiLineComment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 42;
			this.match(JavascriptParser.MultiLineComment);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public singleLineComment(): SingleLineCommentContext {
		let _localctx: SingleLineCommentContext = new SingleLineCommentContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, JavascriptParser.RULE_singleLineComment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 44;
			this.match(JavascriptParser.SingleLineComment);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public functionDeclaration(): FunctionDeclarationContext {
		let _localctx: FunctionDeclarationContext = new FunctionDeclarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 10, JavascriptParser.RULE_functionDeclaration);
		let _la: number;
		try {
			this.state = 69;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case JavascriptParser.Function:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 46;
				this.match(JavascriptParser.Function);
				this.state = 48;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === JavascriptParser.Identifier) {
					{
					this.state = 47;
					this.match(JavascriptParser.Identifier);
					}
				}

				this.state = 50;
				this.match(JavascriptParser.OpenParen);
				this.state = 51;
				this.functionParams();
				this.state = 52;
				this.match(JavascriptParser.CloseParen);
				this.state = 53;
				this.match(JavascriptParser.OpenBrace);
				this.state = 55;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0)) {
					{
					this.state = 54;
					this.sourceElements();
					}
				}

				this.state = 57;
				this.match(JavascriptParser.CloseBrace);
				}
				break;
			case JavascriptParser.OpenParen:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 59;
				this.match(JavascriptParser.OpenParen);
				this.state = 60;
				this.functionParams();
				this.state = 61;
				this.match(JavascriptParser.CloseParen);
				this.state = 62;
				this.match(JavascriptParser.Arrow);
				this.state = 63;
				this.match(JavascriptParser.OpenBrace);
				this.state = 65;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0)) {
					{
					this.state = 64;
					this.sourceElements();
					}
				}

				this.state = 67;
				this.match(JavascriptParser.CloseBrace);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public functionParams(): FunctionParamsContext {
		let _localctx: FunctionParamsContext = new FunctionParamsContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, JavascriptParser.RULE_functionParams);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 74;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Identifier))) !== 0)) {
				{
				{
				this.state = 71;
				this.functionParam();
				}
				}
				this.state = 76;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public functionParam(): FunctionParamContext {
		let _localctx: FunctionParamContext = new FunctionParamContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, JavascriptParser.RULE_functionParam);
		try {
			this.state = 82;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case JavascriptParser.OpenParen:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 77;
				this.parenPairInFunctionParam();
				}
				break;
			case JavascriptParser.OpenBrace:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 78;
				this.bracePairInFunctionParam();
				}
				break;
			case JavascriptParser.MultiLineComment:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 79;
				this.match(JavascriptParser.MultiLineComment);
				}
				break;
			case JavascriptParser.SingleLineComment:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 80;
				this.match(JavascriptParser.SingleLineComment);
				}
				break;
			case JavascriptParser.Identifier:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 81;
				this.match(JavascriptParser.Identifier);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public parenPair(): ParenPairContext {
		let _localctx: ParenPairContext = new ParenPairContext(this._ctx, this.state);
		this.enterRule(_localctx, 16, JavascriptParser.RULE_parenPair);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 84;
			this.match(JavascriptParser.OpenParen);
			this.state = 86;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0)) {
				{
				this.state = 85;
				this.sourceElements();
				}
			}

			this.state = 88;
			this.match(JavascriptParser.CloseParen);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public bracePair(): BracePairContext {
		let _localctx: BracePairContext = new BracePairContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, JavascriptParser.RULE_bracePair);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 90;
			this.match(JavascriptParser.OpenBrace);
			this.state = 92;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.OpenParen) | (1 << JavascriptParser.OpenBrace) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.Identifier))) !== 0)) {
				{
				this.state = 91;
				this.sourceElements();
				}
			}

			this.state = 94;
			this.match(JavascriptParser.CloseBrace);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public parenPairInFunctionParam(): ParenPairInFunctionParamContext {
		let _localctx: ParenPairInFunctionParamContext = new ParenPairInFunctionParamContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, JavascriptParser.RULE_parenPairInFunctionParam);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 96;
			this.match(JavascriptParser.OpenParen);
			this.state = 97;
			this.functionParams();
			this.state = 98;
			this.match(JavascriptParser.CloseParen);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public bracePairInFunctionParam(): BracePairInFunctionParamContext {
		let _localctx: BracePairInFunctionParamContext = new BracePairInFunctionParamContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, JavascriptParser.RULE_bracePairInFunctionParam);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 100;
			this.match(JavascriptParser.OpenBrace);
			this.state = 101;
			this.functionParams();
			this.state = 102;
			this.match(JavascriptParser.CloseBrace);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x03\x11k\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x03" +
		"\x02\x05\x02\x1C\n\x02\x03\x02\x03\x02\x03\x03\x06\x03!\n\x03\r\x03\x0E" +
		"\x03\"\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x05\x04+\n\x04" +
		"\x03\x05\x03\x05\x03\x06\x03\x06\x03\x07\x03\x07\x05\x073\n\x07\x03\x07" +
		"\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07:\n\x07\x03\x07\x03\x07\x03\x07" +
		"\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07D\n\x07\x03\x07\x03\x07" +
		"\x05\x07H\n\x07\x03\b\x07\bK\n\b\f\b\x0E\bN\v\b\x03\t\x03\t\x03\t\x03" +
		"\t\x03\t\x05\tU\n\t\x03\n\x03\n\x05\nY\n\n\x03\n\x03\n\x03\v\x03\v\x05" +
		"\v_\n\v\x03\v\x03\v\x03\f\x03\f\x03\f\x03\f\x03\r\x03\r\x03\r\x03\r\x03" +
		"\r\x02\x02\x02\x0E\x02\x02\x04\x02\x06\x02\b\x02\n\x02\f\x02\x0E\x02\x10" +
		"\x02\x12\x02\x14\x02\x16\x02\x18\x02\x02\x02p\x02\x1B\x03\x02\x02\x02" +
		"\x04 \x03\x02\x02\x02\x06*\x03\x02\x02\x02\b,\x03\x02\x02\x02\n.\x03\x02" +
		"\x02\x02\fG\x03\x02\x02\x02\x0EL\x03\x02\x02\x02\x10T\x03\x02\x02\x02" +
		"\x12V\x03\x02\x02\x02\x14\\\x03\x02\x02\x02\x16b\x03\x02\x02\x02\x18f" +
		"\x03\x02\x02\x02\x1A\x1C\x05\x04\x03\x02\x1B\x1A\x03\x02\x02\x02\x1B\x1C" +
		"\x03\x02\x02\x02\x1C\x1D\x03\x02\x02\x02\x1D\x1E\x07\x02\x02\x03\x1E\x03" +
		"\x03\x02\x02\x02\x1F!\x05\x06\x04\x02 \x1F\x03\x02\x02\x02!\"\x03\x02" +
		"\x02\x02\" \x03\x02\x02\x02\"#\x03\x02\x02\x02#\x05\x03\x02\x02\x02$+" +
		"\x05\b\x05\x02%+\x05\n\x06\x02&+\x07\v\x02\x02\'+\x05\f\x07\x02(+\x05" +
		"\x12\n\x02)+\x05\x14\v\x02*$\x03\x02\x02\x02*%\x03\x02\x02\x02*&\x03\x02" +
		"\x02\x02*\'\x03\x02\x02\x02*(\x03\x02\x02\x02*)\x03\x02\x02\x02+\x07\x03" +
		"\x02\x02\x02,-\x07\x03\x02\x02-\t\x03\x02\x02\x02./\x07\x04\x02\x02/\v" +
		"\x03\x02\x02\x0202\x07\n\x02\x0213\x07\v\x02\x0221\x03\x02\x02\x0223\x03" +
		"\x02\x02\x0234\x03\x02\x02\x0245\x07\x05\x02\x0256\x05\x0E\b\x0267\x07" +
		"\x06\x02\x0279\x07\x07\x02\x028:\x05\x04\x03\x0298\x03\x02\x02\x029:\x03" +
		"\x02\x02\x02:;\x03\x02\x02\x02;<\x07\b\x02\x02<H\x03\x02\x02\x02=>\x07" +
		"\x05\x02\x02>?\x05\x0E\b\x02?@\x07\x06\x02\x02@A\x07\t\x02\x02AC\x07\x07" +
		"\x02\x02BD\x05\x04\x03\x02CB\x03\x02\x02\x02CD\x03\x02\x02\x02DE\x03\x02" +
		"\x02\x02EF\x07\b\x02\x02FH\x03\x02\x02\x02G0\x03\x02\x02\x02G=\x03\x02" +
		"\x02\x02H\r\x03\x02\x02\x02IK\x05\x10\t\x02JI\x03\x02\x02\x02KN\x03\x02" +
		"\x02\x02LJ\x03\x02\x02\x02LM\x03\x02\x02\x02M\x0F\x03\x02\x02\x02NL\x03" +
		"\x02\x02\x02OU\x05\x16\f\x02PU\x05\x18\r\x02QU\x07\x03\x02\x02RU\x07\x04" +
		"\x02\x02SU\x07\v\x02\x02TO\x03\x02\x02\x02TP\x03\x02\x02\x02TQ\x03\x02" +
		"\x02\x02TR\x03\x02\x02\x02TS\x03\x02\x02\x02U\x11\x03\x02\x02\x02VX\x07" +
		"\x05\x02\x02WY\x05\x04\x03\x02XW\x03\x02\x02\x02XY\x03\x02\x02\x02YZ\x03" +
		"\x02\x02\x02Z[\x07\x06\x02\x02[\x13\x03\x02\x02\x02\\^\x07\x07\x02\x02" +
		"]_\x05\x04\x03\x02^]\x03\x02\x02\x02^_\x03\x02\x02\x02_`\x03\x02\x02\x02" +
		"`a\x07\b\x02\x02a\x15\x03\x02\x02\x02bc\x07\x05\x02\x02cd\x05\x0E\b\x02" +
		"de\x07\x06\x02\x02e\x17\x03\x02\x02\x02fg\x07\x07\x02\x02gh\x05\x0E\b" +
		"\x02hi\x07\b\x02\x02i\x19\x03\x02\x02\x02\r\x1B\"*29CGLTX^";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!JavascriptParser.__ATN) {
			JavascriptParser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(JavascriptParser._serializedATN));
		}

		return JavascriptParser.__ATN;
	}

}

export class ProgramContext extends ParserRuleContext {
	public EOF(): TerminalNode { return this.getToken(JavascriptParser.EOF, 0); }
	public sourceElements(): SourceElementsContext | undefined {
		return this.tryGetRuleContext(0, SourceElementsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_program; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterProgram) {
			listener.enterProgram(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitProgram) {
			listener.exitProgram(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitProgram) {
			return visitor.visitProgram(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SourceElementsContext extends ParserRuleContext {
	public sourceElement(): SourceElementContext[];
	public sourceElement(i: number): SourceElementContext;
	public sourceElement(i?: number): SourceElementContext | SourceElementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceElementContext);
		} else {
			return this.getRuleContext(i, SourceElementContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_sourceElements; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterSourceElements) {
			listener.enterSourceElements(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitSourceElements) {
			listener.exitSourceElements(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitSourceElements) {
			return visitor.visitSourceElements(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SourceElementContext extends ParserRuleContext {
	public multiLineComment(): MultiLineCommentContext | undefined {
		return this.tryGetRuleContext(0, MultiLineCommentContext);
	}
	public singleLineComment(): SingleLineCommentContext | undefined {
		return this.tryGetRuleContext(0, SingleLineCommentContext);
	}
	public Identifier(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.Identifier, 0); }
	public functionDeclaration(): FunctionDeclarationContext | undefined {
		return this.tryGetRuleContext(0, FunctionDeclarationContext);
	}
	public parenPair(): ParenPairContext | undefined {
		return this.tryGetRuleContext(0, ParenPairContext);
	}
	public bracePair(): BracePairContext | undefined {
		return this.tryGetRuleContext(0, BracePairContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_sourceElement; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterSourceElement) {
			listener.enterSourceElement(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitSourceElement) {
			listener.exitSourceElement(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitSourceElement) {
			return visitor.visitSourceElement(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class MultiLineCommentContext extends ParserRuleContext {
	public MultiLineComment(): TerminalNode { return this.getToken(JavascriptParser.MultiLineComment, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_multiLineComment; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterMultiLineComment) {
			listener.enterMultiLineComment(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitMultiLineComment) {
			listener.exitMultiLineComment(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitMultiLineComment) {
			return visitor.visitMultiLineComment(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SingleLineCommentContext extends ParserRuleContext {
	public SingleLineComment(): TerminalNode { return this.getToken(JavascriptParser.SingleLineComment, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_singleLineComment; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterSingleLineComment) {
			listener.enterSingleLineComment(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitSingleLineComment) {
			listener.exitSingleLineComment(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitSingleLineComment) {
			return visitor.visitSingleLineComment(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionDeclarationContext extends ParserRuleContext {
	public Function(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.Function, 0); }
	public OpenParen(): TerminalNode { return this.getToken(JavascriptParser.OpenParen, 0); }
	public functionParams(): FunctionParamsContext {
		return this.getRuleContext(0, FunctionParamsContext);
	}
	public CloseParen(): TerminalNode { return this.getToken(JavascriptParser.CloseParen, 0); }
	public OpenBrace(): TerminalNode { return this.getToken(JavascriptParser.OpenBrace, 0); }
	public CloseBrace(): TerminalNode { return this.getToken(JavascriptParser.CloseBrace, 0); }
	public Identifier(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.Identifier, 0); }
	public sourceElements(): SourceElementsContext | undefined {
		return this.tryGetRuleContext(0, SourceElementsContext);
	}
	public Arrow(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.Arrow, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_functionDeclaration; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterFunctionDeclaration) {
			listener.enterFunctionDeclaration(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitFunctionDeclaration) {
			listener.exitFunctionDeclaration(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitFunctionDeclaration) {
			return visitor.visitFunctionDeclaration(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionParamsContext extends ParserRuleContext {
	public functionParam(): FunctionParamContext[];
	public functionParam(i: number): FunctionParamContext;
	public functionParam(i?: number): FunctionParamContext | FunctionParamContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FunctionParamContext);
		} else {
			return this.getRuleContext(i, FunctionParamContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_functionParams; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterFunctionParams) {
			listener.enterFunctionParams(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitFunctionParams) {
			listener.exitFunctionParams(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitFunctionParams) {
			return visitor.visitFunctionParams(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionParamContext extends ParserRuleContext {
	public parenPairInFunctionParam(): ParenPairInFunctionParamContext | undefined {
		return this.tryGetRuleContext(0, ParenPairInFunctionParamContext);
	}
	public bracePairInFunctionParam(): BracePairInFunctionParamContext | undefined {
		return this.tryGetRuleContext(0, BracePairInFunctionParamContext);
	}
	public MultiLineComment(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.MultiLineComment, 0); }
	public SingleLineComment(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.SingleLineComment, 0); }
	public Identifier(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.Identifier, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_functionParam; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterFunctionParam) {
			listener.enterFunctionParam(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitFunctionParam) {
			listener.exitFunctionParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitFunctionParam) {
			return visitor.visitFunctionParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParenPairContext extends ParserRuleContext {
	public OpenParen(): TerminalNode { return this.getToken(JavascriptParser.OpenParen, 0); }
	public CloseParen(): TerminalNode { return this.getToken(JavascriptParser.CloseParen, 0); }
	public sourceElements(): SourceElementsContext | undefined {
		return this.tryGetRuleContext(0, SourceElementsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_parenPair; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterParenPair) {
			listener.enterParenPair(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitParenPair) {
			listener.exitParenPair(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitParenPair) {
			return visitor.visitParenPair(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class BracePairContext extends ParserRuleContext {
	public OpenBrace(): TerminalNode { return this.getToken(JavascriptParser.OpenBrace, 0); }
	public CloseBrace(): TerminalNode { return this.getToken(JavascriptParser.CloseBrace, 0); }
	public sourceElements(): SourceElementsContext | undefined {
		return this.tryGetRuleContext(0, SourceElementsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_bracePair; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterBracePair) {
			listener.enterBracePair(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitBracePair) {
			listener.exitBracePair(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitBracePair) {
			return visitor.visitBracePair(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParenPairInFunctionParamContext extends ParserRuleContext {
	public OpenParen(): TerminalNode { return this.getToken(JavascriptParser.OpenParen, 0); }
	public functionParams(): FunctionParamsContext {
		return this.getRuleContext(0, FunctionParamsContext);
	}
	public CloseParen(): TerminalNode { return this.getToken(JavascriptParser.CloseParen, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_parenPairInFunctionParam; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterParenPairInFunctionParam) {
			listener.enterParenPairInFunctionParam(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitParenPairInFunctionParam) {
			listener.exitParenPairInFunctionParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitParenPairInFunctionParam) {
			return visitor.visitParenPairInFunctionParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class BracePairInFunctionParamContext extends ParserRuleContext {
	public OpenBrace(): TerminalNode { return this.getToken(JavascriptParser.OpenBrace, 0); }
	public functionParams(): FunctionParamsContext {
		return this.getRuleContext(0, FunctionParamsContext);
	}
	public CloseBrace(): TerminalNode { return this.getToken(JavascriptParser.CloseBrace, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_bracePairInFunctionParam; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterBracePairInFunctionParam) {
			listener.enterBracePairInFunctionParam(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitBracePairInFunctionParam) {
			listener.exitBracePairInFunctionParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitBracePairInFunctionParam) {
			return visitor.visitBracePairInFunctionParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


