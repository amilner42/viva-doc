parser grammar JavaParser;


options {
    tokenVocab=JavaLexer;
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
