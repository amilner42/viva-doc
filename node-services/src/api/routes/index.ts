import Express from "express";
import ApiRoutes from "./api";

const expressRouter = Express.Router();
expressRouter.use('/api', ApiRoutes);


export = expressRouter;
