import Express from "express";

import * as ClientErrors from "../../client-errors";
import UserRoutes from "./users";
import ReviewRoutes from "./reviews";


const expressRouter = Express.Router();
expressRouter.use('/', UserRoutes);
expressRouter.use('/', ReviewRoutes);


// TODO check type does this even work??
// Handle sending errors to the client
expressRouter.use(function(err: any, req: any, res: any, next: any) {

  if (isProperlyFormedError(err)) {
    return res.status(err.httpCode).send(err);
  }

  console.log("Improper Error Has Occured.");

  try {
    console.log(`Error: ${err}`);
    console.log(`Error Stack: ${JSON.stringify(err.getStack())}`);
  } catch { }

  return res.status(500).send(ClientErrors.internalServerError);
});


// 3 fields required to be a properly formed error. Other optional fields allowed.
const isProperlyFormedError = (err: any): boolean => {
  return (typeof err.httpCode === "number")
          && (typeof err.message === "string")
          && (typeof err.errorCode === "number");
}


export = expressRouter;
