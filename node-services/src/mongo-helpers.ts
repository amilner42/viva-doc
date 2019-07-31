/* Module for mongo helpers. */

import * as R from "ramda";


interface MongoUpdateResult {
  ok: number;
  n: number;
  nModified: number;
}


export const updateOk = (updateResult: MongoUpdateResult) => {
  return updateResult.ok === 1;
}


export const updateMatchedNResults = R.curry((n: number, updateResult: MongoUpdateResult) => {
  return updateResult.n === n;
});


export const updateMatchedOneResult = updateMatchedNResults(1);


export const updateModifiedNResults = R.curry((n: number, updateResult: MongoUpdateResult) => {
  return updateResult.nModified === n;
});


export const updateModifiedOneResult = updateModifiedNResults(1);
