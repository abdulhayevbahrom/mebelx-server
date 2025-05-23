const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["Kirim", "Chiqim"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        // Chiqim (Xarajat) kategoriyalari
        "Ish haqi",
        "Avans",
        "Ijara",
        "Mebel",
        "Kantselyariya",
        "Xomashyo",
        "Transport",
        "Kommunal to‘lovlar",
        "Reklama va marketing",
        "Texnika ta’miri",
        "Solqlar",
        "Boshqa chiqimlar",
        "Do'kon qarzini to'lash",
        "Do‘kondan qaytarilgan mablag",
        "Qarzni to'lash",
        "Qarz Berish",
        "Qaytarilgan mablag'",
        "Yetkazib beruvchilar",

        // Kirim (Daromad) kategoriyalari
        "Mijoz to‘lovlari",
        "Do'kondan qaytarilgan mablag",
        "Qarz olish",
        "Investor sarmoyasi",
        "Qaytgan mablag‘",
        "Davlat subsidiyasi",
        "Boshqa daromadlar",
        "Soldo",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentType: {
      type: String,
      enum: ["Naqd", "Karta orqali", "Bank orqali", "bankTransfer", "dollar"],
    },
    relevantId: {
      // Kimga tegishli
      type: mongoose.Schema.Types.ObjectId,
    },
    soldoDate: {
      from: {
        type: Date,
      },
      to: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

const Expense = mongoose.model("expense", expenseSchema);
module.exports = Expense;



