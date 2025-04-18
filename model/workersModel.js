const mongoose = require("mongoose");

const workersSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    address: { type: String },
    dayOfBirth: { type: String },
    phone: { type: String, required: true, unique: true },
    idNumber: { type: String, required: true },
    password: { type: String },
    salary: { type: Number, default: 0 }, // Maosh (now Number for calculations)
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
  { timestamps: true, toJSON: { virtuals: true } }
);


module.exports = mongoose.model("Workers", workersSchema);




