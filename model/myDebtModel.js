const mongoose = require("mongoose");

const myDebtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // Umumiy qarz summasi
    isPaid: { type: Boolean, default: false }, // Qarz to‘langanmi yoki yo‘qmi
    description: { type: String, trim: true },
    type: { type: String, required: true, trim: true }, // "naqt" yoki "dollar"
    payments: [
      {
        amount: { type: Number, required: true }, // To‘langan summa
        date: { type: Date, default: Date.now }, // To‘lov sanasi
      },
    ],
  },
  { timestamps: true }
);

myDebtSchema.methods.calculateRemainingDebt = function () {
  const totalPaid = this.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  return this.amount - totalPaid;
};

myDebtSchema.methods.checkIfPaid = function () {
  this.isPaid = this.calculateRemainingDebt() <= 0;
};

const MyDebt = mongoose.model("MyDebt", myDebtSchema);
module.exports = MyDebt;
