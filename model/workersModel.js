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
    salary: { type: String, default: "0" }, // Maosh
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
  { timestamps: true, strict: "remove", toJSON: { virtuals: true } }
);

// ** Virtual Field ** - Soatlik maoshni hisoblash
workersSchema.virtual("hourlySalary").get(function () {
  const totalHours = 260; // Oylik ish soati
  const monthlySalary = parseFloat(this.salary) || 0;
  return totalHours > 0 ? (monthlySalary / totalHours).toFixed(2) : "0";
});

module.exports = mongoose.model("workers", workersSchema);
