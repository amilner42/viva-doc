const settleAll = (promiseArray) => {

  const wrappedPromises = promiseArray.map(async (promise) => {

    try {

      const promiseResult = await promise;
      const wrappedPromise =  {
        promiseDid: "resolve",
        with: promiseResult
      }

      return wrappedPromise;

    } catch (err) {

      const wrappedPromise = {
        promiseDid: "reject",
        with: err
      }

      return wrappedPromise;
    }

  });

  return Promise.all(wrappedPromises);
}

settleAll([1,2,3,4,5].map((number) => {
  if (number % 2 === 0) {
    return Promise.resolve(number);
  } else {
    return Promise.reject(number);
  }
}))
.then((result) => {
  console.log(result);
})
.catch((err) => {
  console.log(err)
})
