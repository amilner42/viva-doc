/* Module to parse all comments and function declarations

Thoughts:

    Functions can't defined in the params of another function decl
    Functions can be defined in the body of a function decl
    Functions can be defined as the argument to another function
    Braces can be in many places
    Functions can be `function () { ... } - or - () => { ... } `

    We've got single line comments and multi-line comments.

*/

parser grammar JavascriptParser;

options {
    tokenVocab=JavascriptLexer;
}

program
    : sourceElements? EOF;

sourceElements
    : sourceElement+
    ;

sourceElement
    : multiLineComment
    | singleLineComment
    | Identifier
    | functionDeclaration
    | parenPair
    | bracePair
    ;

multiLineComment
    : MultiLineComment
    ;

singleLineComment
    : SingleLineComment
    ;

functionDeclaration
    : Function Identifier? OpenParen functionParams CloseParen OpenBrace sourceElements? CloseBrace
    | OpenParen functionParams CloseParen Arrow OpenBrace sourceElements? CloseBrace
    ;

functionParams
    : functionParam*
    ;

functionParam
    : parenPairInFunctionParam
    | bracePairInFunctionParam
    | MultiLineComment
    | SingleLineComment
    | Identifier
    ;

parenPair
    : OpenParen sourceElements? CloseParen
    ;

bracePair
    : OpenBrace sourceElements? CloseBrace
    ;

parenPairInFunctionParam
    : OpenParen functionParams CloseParen
    ;

bracePairInFunctionParam
    : OpenBrace functionParams CloseBrace
    ;
