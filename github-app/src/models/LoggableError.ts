import mongoose = require("mongoose")


export interface LoggableError {
  name: string;
  installationId: number;
  isSevere: boolean;
  data: any;
  stack: string;
}

const LoggableErrorSchema = new mongoose.Schema({
  name: { type: String, required: [true, "can't be blank"] },
  installationId: { type: Number, required: [true, "can't be blank"]},
  isSevere: { type: Boolean, required: [true, "can't be blank"] },
  data: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  stack : { type: String, required: [true, "can't be blank"] }
});


mongoose.model("LoggableError", LoggableErrorSchema);
