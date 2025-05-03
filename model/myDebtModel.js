const mongoose = require("mongoose");

const debtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: "Kompaniya" }, // Kompaniya nomi
    debts: [
      {
        amount: { type: Number, required: true, min: 0 }, // Qarz miqdori
        date: { type: Date, default: Date.now }, // Sana
        description: { type: String, trim: true }, // Tavsif
        type: {
          type: String,
          required: true,
          enum: ["Naqd", "Bank orqali", "dollar"], // Valyuta turi: naqd pul yoki dollar
          trim: true,
        },
      },
    ],
    payments: [
      {
        amount: { type: Number, required: true, min: 0 }, // To'lov miqdori
        date: { type: Date, default: Date.now }, // Sana
        description: { type: String, trim: true }, // Tavsif
        type: {
          type: String,
          required: true,
          enum: ["Naqd", "Bank orqali", "dollar"], // Valyuta turi: naqd pul yoki dollar
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true, // Yaratilgan va yangilangan sanani avtomatik saqlash
    toJSON: { virtuals: true }, // Virtual maydonlarni JSON chiqishida ko'rsatish
    toObject: { virtuals: true }, // Virtual maydonlarni ob'ektda ko'rsatish
  }
);

const MyDebt = mongoose.model("MyDebt", debtSchema);
module.exports = MyDebt;




