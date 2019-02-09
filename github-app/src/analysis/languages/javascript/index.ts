// Module for javascript-specific parsing functionality

import { Maybe } from "../../../functional-types"
import { FileParser } from "./../index"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"

import { JavascriptLexer } from "./JavascriptLexer"
import { JavascriptParser, FunctionDeclarationContext, ProgramContext, SingleLineCommentContext, MultiLineCommentContext } from "./JavascriptParser"
import { JavascriptParserListener } from "./JavascriptParserListener"

/**
 * A listener which returns the total number of methods declared in the parse tree.
 */
class ExtractCommentsAndFunctionsListener implements JavascriptParserListener {

    enterFunctionDeclaration(ctx: FunctionDeclarationContext) {
        if(ctx._stop === undefined) {
            console.log("undefined ending token")
            return
        }

        console.log(`function from line ${ctx._start.line} to ${ctx._stop.line}`)
    }

    enterSingleLineComment(ctx: SingleLineCommentContext) {
        if(ctx._stop === undefined) {
            console.log("undefined ending token")
            return
        }

        console.log(`single comment from line ${ctx._start.line} to ${ctx._stop.line}`)
    }

    enterMultiLineComment(ctx: MultiLineCommentContext) {
        if(ctx._stop === undefined) {
            console.log("undefined ending token")
            return
        }

        console.log(`multiline comment from line ${ctx._start.line} to ${ctx._stop.line}`)
    }
}

const TEST_JS_CODE = `
/*

JavascriptLexer.g4

*/


var http = require('http'),
    path = require('path'),
    methods = require('methods'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    passport = require('passport'),
    errorhandler = require('errorhandler'),
    mongoose = require('mongoose');

// Env variables
const isProduction = process.env.NODE_ENV === 'production';
const mongoProdURI = process.env.MONGODB_URI;
const port = process.env.PORT;

// Create global app object
var app = express();

app.use(cors());

// Normal express config defaults
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require('method-override')());

if (!isProduction) {
  app.use(errorhandler());
}

if(isProduction){
  mongoose.connect(mongoProdURI);
} else {
  mongoose.connect('mongodb://localhost/kickstarter');
  mongoose.set('debug', true);
}

require('./models/User');
require('./config/passport');

app.use(require('./routes'));

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use(function(err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({'errors': {
      message: err.message,
      error: err
    }});
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({'errors': {
    message: err.message,
    error: {}
  }});
});

// finally, let's start our server...
var server = app.listen( port || 3001, function(){
  console.log('Listening on port ' + server.address().port);
});
`

// TODO
// Create lexer and parser
let inputStream = new ANTLRInputStream(TEST_JS_CODE);
let lexer = new JavascriptLexer(inputStream);
let tokenStream = new CommonTokenStream(lexer);
let parser = new JavascriptParser(tokenStream);
let parseTree: ProgramContext = parser.program(); // Parse our program
const listener: JavascriptParserListener = new ExtractCommentsAndFunctionsListener();

// Visit the parse tree
ParseTreeWalker.DEFAULT.walk(listener, parseTree)

// The FileParser for a javascript file.
export const fileParser: Maybe<FileParser> = null
