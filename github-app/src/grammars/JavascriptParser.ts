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
	public static readonly RegularExpressionLiteral = 3;
	public static readonly OpenParen = 4;
	public static readonly CloseParen = 5;
	public static readonly OpenBrace = 6;
	public static readonly CloseBrace = 7;
	public static readonly Comma = 8;
	public static readonly ARROW = 9;
	public static readonly Function = 10;
	public static readonly StringLiteral = 11;
	public static readonly TemplateStringLiteral = 12;
	public static readonly WhiteSpaces = 13;
	public static readonly LineTerminator = 14;
	public static readonly UnexpectedCharacter = 15;
	public static readonly RULE_program = 0;
	public static readonly RULE_sourceElements = 1;
	public static readonly RULE_sourceElement = 2;
	public static readonly RULE_functionDeclaration = 3;
	public static readonly RULE_irrelevant = 4;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"program", "sourceElements", "sourceElement", "functionDeclaration", "irrelevant",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, "'('", "')'", "'{'", "'}'", 
		"','", "'=>'", "'function'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "MultiLineComment", "SingleLineComment", "RegularExpressionLiteral", 
		"OpenParen", "CloseParen", "OpenBrace", "CloseBrace", "Comma", "ARROW", 
		"Function", "StringLiteral", "TemplateStringLiteral", "WhiteSpaces", "LineTerminator", 
		"UnexpectedCharacter",
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
			this.state = 11;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.UnexpectedCharacter))) !== 0)) {
				{
				this.state = 10;
				this.sourceElements();
				}
			}

			this.state = 13;
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
			this.state = 16;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 15;
				this.sourceElement();
				}
				}
				this.state = 18;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << JavascriptParser.MultiLineComment) | (1 << JavascriptParser.SingleLineComment) | (1 << JavascriptParser.Function) | (1 << JavascriptParser.UnexpectedCharacter))) !== 0));
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
			this.state = 24;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case JavascriptParser.MultiLineComment:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 20;
				this.match(JavascriptParser.MultiLineComment);
				}
				break;
			case JavascriptParser.SingleLineComment:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 21;
				this.match(JavascriptParser.SingleLineComment);
				}
				break;
			case JavascriptParser.Function:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 22;
				this.functionDeclaration();
				}
				break;
			case JavascriptParser.UnexpectedCharacter:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 23;
				this.irrelevant();
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
	public functionDeclaration(): FunctionDeclarationContext {
		let _localctx: FunctionDeclarationContext = new FunctionDeclarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, JavascriptParser.RULE_functionDeclaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 26;
			this.match(JavascriptParser.Function);
			this.state = 28;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === JavascriptParser.UnexpectedCharacter) {
				{
				this.state = 27;
				this.irrelevant();
				}
			}

			this.state = 30;
			this.match(JavascriptParser.OpenParen);
			this.state = 32;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === JavascriptParser.UnexpectedCharacter) {
				{
				this.state = 31;
				this.irrelevant();
				}
			}

			this.state = 34;
			this.match(JavascriptParser.CloseParen);
			this.state = 36;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === JavascriptParser.UnexpectedCharacter) {
				{
				this.state = 35;
				this.irrelevant();
				}
			}

			this.state = 38;
			this.match(JavascriptParser.OpenBrace);
			this.state = 40;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === JavascriptParser.UnexpectedCharacter) {
				{
				this.state = 39;
				this.irrelevant();
				}
			}

			this.state = 42;
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
	public irrelevant(): IrrelevantContext {
		let _localctx: IrrelevantContext = new IrrelevantContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, JavascriptParser.RULE_irrelevant);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 44;
			this.match(JavascriptParser.UnexpectedCharacter);
			this.state = 48;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 7, this._ctx);
			while (_alt !== 1 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1 + 1) {
					{
					{
					this.state = 45;
					this.match(JavascriptParser.UnexpectedCharacter);
					}
					}
				}
				this.state = 50;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 7, this._ctx);
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

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x03\x116\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x03\x02" +
		"\x05\x02\x0E\n\x02\x03\x02\x03\x02\x03\x03\x06\x03\x13\n\x03\r\x03\x0E" +
		"\x03\x14\x03\x04\x03\x04\x03\x04\x03\x04\x05\x04\x1B\n\x04\x03\x05\x03" +
		"\x05\x05\x05\x1F\n\x05\x03\x05\x03\x05\x05\x05#\n\x05\x03\x05\x03\x05" +
		"\x05\x05\'\n\x05\x03\x05\x03\x05\x05\x05+\n\x05\x03\x05\x03\x05\x03\x06" +
		"\x03\x06\x07\x061\n\x06\f\x06\x0E\x064\v\x06\x03\x06\x032\x02\x02\x07" +
		"\x02\x02\x04\x02\x06\x02\b\x02\n\x02\x02\x02:\x02\r\x03\x02\x02\x02\x04" +
		"\x12\x03\x02\x02\x02\x06\x1A\x03\x02\x02\x02\b\x1C\x03\x02\x02\x02\n." +
		"\x03\x02\x02\x02\f\x0E\x05\x04\x03\x02\r\f\x03\x02\x02\x02\r\x0E\x03\x02" +
		"\x02\x02\x0E\x0F\x03\x02\x02\x02\x0F\x10\x07\x02\x02\x03\x10\x03\x03\x02" +
		"\x02\x02\x11\x13\x05\x06\x04\x02\x12\x11\x03\x02\x02\x02\x13\x14\x03\x02" +
		"\x02\x02\x14\x12\x03\x02\x02\x02\x14\x15\x03\x02\x02\x02\x15\x05\x03\x02" +
		"\x02\x02\x16\x1B\x07\x03\x02\x02\x17\x1B\x07\x04\x02\x02\x18\x1B\x05\b" +
		"\x05\x02\x19\x1B\x05\n\x06\x02\x1A\x16\x03\x02\x02\x02\x1A\x17\x03\x02" +
		"\x02\x02\x1A\x18\x03\x02\x02\x02\x1A\x19\x03\x02\x02\x02\x1B\x07\x03\x02" +
		"\x02\x02\x1C\x1E\x07\f\x02\x02\x1D\x1F\x05\n\x06\x02\x1E\x1D\x03\x02\x02" +
		"\x02\x1E\x1F\x03\x02\x02\x02\x1F \x03\x02\x02\x02 \"\x07\x06\x02\x02!" +
		"#\x05\n\x06\x02\"!\x03\x02\x02\x02\"#\x03\x02\x02\x02#$\x03\x02\x02\x02" +
		"$&\x07\x07\x02\x02%\'\x05\n\x06\x02&%\x03\x02\x02\x02&\'\x03\x02\x02\x02" +
		"\'(\x03\x02\x02\x02(*\x07\b\x02\x02)+\x05\n\x06\x02*)\x03\x02\x02\x02" +
		"*+\x03\x02\x02\x02+,\x03\x02\x02\x02,-\x07\t\x02\x02-\t\x03\x02\x02\x02" +
		".2\x07\x11\x02\x02/1\x07\x11\x02\x020/\x03\x02\x02\x0214\x03\x02\x02\x02" +
		"23\x03\x02\x02\x0220\x03\x02\x02\x023\v\x03\x02\x02\x0242\x03\x02\x02" +
		"\x02\n\r\x14\x1A\x1E\"&*2";
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
	public MultiLineComment(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.MultiLineComment, 0); }
	public SingleLineComment(): TerminalNode | undefined { return this.tryGetToken(JavascriptParser.SingleLineComment, 0); }
	public functionDeclaration(): FunctionDeclarationContext | undefined {
		return this.tryGetRuleContext(0, FunctionDeclarationContext);
	}
	public irrelevant(): IrrelevantContext | undefined {
		return this.tryGetRuleContext(0, IrrelevantContext);
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


export class FunctionDeclarationContext extends ParserRuleContext {
	public Function(): TerminalNode { return this.getToken(JavascriptParser.Function, 0); }
	public OpenParen(): TerminalNode { return this.getToken(JavascriptParser.OpenParen, 0); }
	public CloseParen(): TerminalNode { return this.getToken(JavascriptParser.CloseParen, 0); }
	public OpenBrace(): TerminalNode { return this.getToken(JavascriptParser.OpenBrace, 0); }
	public CloseBrace(): TerminalNode { return this.getToken(JavascriptParser.CloseBrace, 0); }
	public irrelevant(): IrrelevantContext[];
	public irrelevant(i: number): IrrelevantContext;
	public irrelevant(i?: number): IrrelevantContext | IrrelevantContext[] {
		if (i === undefined) {
			return this.getRuleContexts(IrrelevantContext);
		} else {
			return this.getRuleContext(i, IrrelevantContext);
		}
	}
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


export class IrrelevantContext extends ParserRuleContext {
	public UnexpectedCharacter(): TerminalNode[];
	public UnexpectedCharacter(i: number): TerminalNode;
	public UnexpectedCharacter(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(JavascriptParser.UnexpectedCharacter);
		} else {
			return this.getToken(JavascriptParser.UnexpectedCharacter, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return JavascriptParser.RULE_irrelevant; }
	// @Override
	public enterRule(listener: JavascriptParserListener): void {
		if (listener.enterIrrelevant) {
			listener.enterIrrelevant(this);
		}
	}
	// @Override
	public exitRule(listener: JavascriptParserListener): void {
		if (listener.exitIrrelevant) {
			listener.exitIrrelevant(this);
		}
	}
	// @Override
	public accept<Result>(visitor: JavascriptParserVisitor<Result>): Result {
		if (visitor.visitIrrelevant) {
			return visitor.visitIrrelevant(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


