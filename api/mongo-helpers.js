/* Module for mongo helpers. */

const R = require("ramda");


const updateOk = (updateResult) => {
  return updateResult.ok === 1;
}


const updateMatchedNResults = R.curry((n, updateResult) => {
  return update.n === n;
});


const updateMatchedOneResult = updateMatchedNResults(1);


const updateModifiedNResults = R.curry((n, updateResult) => {
  return updateResult.nModified === n;
});


const updateModifiedOneResult = updateModifiedNResults(1);


module.exports = {
  updateOk,
  updateMatchedNResults,
  updateMatchedOneResult,
  updateModifiedNResults,
  updateModifiedOneResult
}
