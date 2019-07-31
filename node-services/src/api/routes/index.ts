import Express from "express";

import UserRoutes from "./users";
import ReviewRoutes from "./reviews";


const apiBase = "/api";
const expressRouter = Express.Router();

expressRouter.use(apiBase, UserRoutes);
expressRouter.use(apiBase, ReviewRoutes);


export = expressRouter;
