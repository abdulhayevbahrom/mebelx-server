const mongoose = require("mongoose");

const workersModel = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    address: { type: String },
    dayOfBirth: { type: String },
    phone: { type: String, required: true, unique: true },
    idNumber: { type: String, required: true },
    password: { type: String },
    salary: { type: String, default: "0" },
    login: { type: String },
    workerType: { type: String },
    img: { type: String },
    role: {
      type: String,
      enum: [
        "manager",
        "distributor",
        "director",
        "accountant",
        "warehouseman",
        "deputy",
        "worker",
      ],
      default: "worker",
    },
  },
  { timestamps: true, strict: "remove" }
);

module.exports = mongoose.model("workers", workersModel);
