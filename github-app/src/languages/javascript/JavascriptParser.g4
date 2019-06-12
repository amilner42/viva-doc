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
    ;


multiLineComment
    : MultiLineComment
    ;


singleLineComment
    : SingleLineComment
    ;
