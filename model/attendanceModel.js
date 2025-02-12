const { Schema, model } = require("mongoose");

const attendanceSchema = new Schema(
  {
    workerName: { type: String },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    date: {
      type: String,
      default: new Date().toISOString().slice(0, 10),
    },
    status: {
      foiz: { type: Number },
      loc: { type: String }
    },
    inTime: { type: String, default: new Date().toISOString().slice(11, 16) }, // Kirish vaqti (HH:mm)
    workingHours: { type: String },
  },
  {
    timestamps: true,
  }
);

const Attendance = model("Attendance", attendanceSchema);
module.exports = Attendance;
