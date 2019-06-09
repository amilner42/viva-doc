const router = require('express').Router();
const errors = require('../errors');

router.use('/', require('./users'));
router.use('/', require('./reviews'));


// Handle sending errors to the client
router.use(function(err, req, res, next) {

  if (isProperlyFormedError(err)) {
    return res.status(err.httpCode).send(err);
  }

  console.log(`LOG IMPROPER ERROR: ${err}`);

  return res.status(500).send(errors.internalServerError);
});


// 3 fields required to be a properly formed error. Other optional fields allowed.
const isProperlyFormedError = (err) => {
  return (typeof err.httpCode === "number")
          && (typeof err.message === "string")
          && (typeof err.errorCode === "number");
}


module.exports = router;
