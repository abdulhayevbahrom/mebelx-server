const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the Working Hours Schema
const workingDays = new Schema({
  minthlyWorkingDay: {
    type: Number,
    required: true,
    default: 26,
  },
  createdAt: {
    type: Date,
    default: () => new Date(new Date().getTime() + 5 * 60 * 60 * 1000),
  },
});

const WorkingDays = mongoose.model("WorkingDays", workingDays);
module.exports = WorkingDays;
