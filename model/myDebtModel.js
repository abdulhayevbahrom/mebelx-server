





const mongoose = require("mongoose");

const myDebtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    debts: [
      {
        amount: { type: Number, required: true }, // To‘langan summa
        date: { type: Date, default: Date.now }, // To‘lov sanasi
        description: { type: String, trim: true },
        type: { type: String, required: true, trim: true }, // "naqt" yoki "dollar"
      },
    ],
    payments: [
      {
        amount: { type: Number, required: true }, // To‘langan summa
        date: { type: Date, default: Date.now }, // To‘lov sanasi
        description: { type: String, trim: true },
        type: { type: String, required: true, trim: true }, // "naqt" yoki "dollar"
      },
    ],
  },
  { timestamps: true }
);


const MyDebt = mongoose.model("MyDebt", myDebtSchema);
module.exports = MyDebt;




