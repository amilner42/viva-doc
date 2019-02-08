parser grammar JavascriptParser;

options {
    tokenVocab=JavascriptLexer;
}

program
    : sourceElements? EOF
;

sourceElements
    : sourceElement+
    ;

sourceElement
    : MultiLineComment
    | SingleLineComment
    | functionDeclaration
    | irrelevant
    ;


functionDeclaration
    : Function irrelevant? OpenParen irrelevant? CloseParen irrelevant? OpenBrace irrelevant? CloseBrace
    ;

irrelevant
    : UnexpectedCharacter UnexpectedCharacter*?
    ;
