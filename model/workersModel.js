const mongoose = require("mongoose");

const workersModel = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    address: { type: String },
    dayOfBirth: { type: String },
    phone: { type: String, required: true, unique: true },
    img: { type: String },
    idNumber: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("workers", workersModel);
