var http = require('http'),
    path = require('path'),
    methods = require('methods'),
    express = require('express'),
    expressSession = require('express-session'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    passport = require('passport'),
    errorhandler = require('errorhandler'),
    mongoose = require('mongoose');
    MongoStore = require('connect-mongo')(expressSession);

const config = require('./config');

const isProduction = config.isProduction;

// Create global app object
var app = express();

app.use(cors({ credentials: true, origin: config.webClientOrigin }));

// Normal express config defaults
app.use(require('morgan')('dev'));
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressSession({
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({url: config.mongoDbUri})
}));
app.use(require('method-override')());

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(config.mongoDbUri);

// Set debug settings for dev mode.
if (!isProduction) {
  app.use(errorhandler());
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
var server = app.listen(config.port, function(){
  console.log('Listening on port ' + server.address().port);
});
