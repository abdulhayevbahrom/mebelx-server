const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Working Hours Schema
const workingHours = new Schema({
  voxa: {
    type: Number,
    required: true,
  },
  toshkent: {
    type: Number,
    required: true,
  },
  vodiy: {
    type: Number,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  INN: {
    type: String,
    required: true,
  },
  MFO: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the date when the record is created
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Automatically set the date when the record is updated
  },
});

const WorkingHours = mongoose.model("WorkingHours", workingHours);
module.exports = WorkingHours;