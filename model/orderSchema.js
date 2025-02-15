const mongoose = require("mongoose");

// Material Schema
const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  materialID: { type: mongoose.Schema.Types.ObjectId, ref: "WarehouseItem", required: true },
});

// Material Given Schema (Ombordan chiqarilgan materiallar)
const MaterialGivenSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  }, // Qaysi buyurtmaga tegishli
  materialName: { type: String, required: true }, // Material nomi
  givenQuantity: { type: Number, required: true }, // Omborchi bergan miqdor
  unit: { type: String, required: true },
  date: { type: Date, default: Date.now }, // Qachon berilganligi
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WarehouseItem", required: true
  },
});

// Customer Schema (Mijoz ma'lumotlari)
const CustomerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Jismoniy shaxs", "Yuridik shaxs"],
    required: true,
  },
  fullName: { type: String }, // Faqat jismoniy shaxslar uchun
  phone: { type: String, required: true },
  companyName: { type: String }, // Faqat yuridik shaxslar uchun
  director: { type: String },
  inn: { type: Number },
});

// Order Address Schema (Buyurtma manzili)
const OrderAddressSchema = new mongoose.Schema({
  region: { type: String, required: true },
  district: { type: String, required: true },
  street: { type: String, required: true },
  location: { type: String, required: true },
});

// Order Schema (Buyurtma ma'lumotlari)
const OrderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    budget: { type: Number, required: true },
    paid: { type: Number, required: true },
    date: { type: Date, required: true },
    estimatedDays: { type: Number, required: true },
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    image: { type: String },
    customer: { type: CustomerSchema, required: true },
    materials: [MaterialSchema],
    address: { type: OrderAddressSchema, required: true },
    isType: { type: Boolean, default: true },

  },
  { timestamps: true }
);

// Model yaratish
const MaterialGiven = mongoose.model("MaterialGiven", MaterialGivenSchema);
const Order = mongoose.model("Order", OrderSchema);

// Eksport qilish
module.exports = { Order, MaterialGiven };
