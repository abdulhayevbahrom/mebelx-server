const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dayOfBirth: { type: String, required: true },
    salary: { type: Number },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    login: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["manager", "seller", "director", "accountant", "warehouseman", "deputy_director"],
      default: "director",
    }
  },
  { timestamps: true }
);

const Admins = mongoose.model("User", AdminSchema);
module.exports = Admins;
