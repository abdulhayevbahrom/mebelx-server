const mongoose = require("mongoose");

const driversSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Drivers = mongoose.model("Drivers", driversSchema);
module.exports = Drivers;
