import mongoose = require("mongoose")


export interface SevereError {
  name: string;
  installationId: number;
  data: any;
  stack: string;
}

const SevereErrorSchema = new mongoose.Schema({
  name: { type: String, required: [true, "can't be blank"] },
  installationId: { type: Number, required: [true, "can't be blank"]},
  data: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  stack : { type: String, required: [true, "can't be blank"] }
});


mongoose.model("SevereError", SevereErrorSchema);
