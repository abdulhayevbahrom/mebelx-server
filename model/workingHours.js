const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Working Hours Schema
const workingHours = new Schema({
  wages: {
    type: Number,
    required: true,
    min: 0, // Prevent negative values
  },
  overtimeWages: {
    type: Number,
    required: true,
    min: 0, // Prevent negative values
  },
  workingHours: {
    type: String,
    required: true,
  },
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

