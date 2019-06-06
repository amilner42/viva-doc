const router = require('express').Router();
const errorMessages = require('../error-messages');

router.use('/', require('./users'));
router.use('/', require('./reviews'));


// Handle sending errors to the client
router.use(function(err, req, res, next) {

  if (isProperlyFormedError(err)) {
    return res.status(err.httpCode).send({ message: err.message });
  }

  console.log(`LOG IMPROPER ERROR: ${err}`);

  return res.status(500).send({ message: errorMessages.internalServerError });
});


const isProperlyFormedError = (err) => {
  return (typeof err.httpCode === "number") && (typeof err.message === "string");
}


module.exports = router;
