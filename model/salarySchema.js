const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
    {
        workerId: { type: mongoose.Schema.Types.ObjectId, ref: "workers", required: true },
        date: { type: String, default: () => new Date().toISOString().split("T")[0] }, // "YYYY-MM-DD" formatida
        salaryType: { type: String, enum: ["avans", "salary"], required: true },
        amount: { type: Number, required: true }, // Ish haqi yoki avans summasi
    },
    { timestamps: true }
);

const Salary = mongoose.model("Salary", salarySchema);
module.exports = Salary;
