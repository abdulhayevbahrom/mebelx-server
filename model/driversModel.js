const mongoose = require("mongoose");

const driversSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    balance: { type: Number, required: true, default: 0 },
    stroy: [
      {
        state: {
          type: String,
          enum: ["olib keldi", "olib ketdi"],
          required: true,
        },
        price: { type: Number, required: true, default: 0 },
        date: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const Drivers = mongoose.model("Drivers", driversSchema);
module.exports = Drivers;
