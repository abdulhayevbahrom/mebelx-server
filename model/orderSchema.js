const mongoose = require("mongoose");

// Material Schema
const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  materialID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WarehouseItem",
    required: true,
  },
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
    ref: "WarehouseItem",
    required: true,
  },
  orderCardId: { type: String },
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
  inn: { type: String },
});

// Order Address Schema (Buyurtma manzili)
const OrderAddressSchema = new mongoose.Schema({
  region: { type: String, required: true },
  district: { type: String, required: true },
  street: { type: String, required: true },
  location: { type: String, required: true },
});

// Order Address Schema (Buyurtma manzili)
const OrderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dimensions: {
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  budget: { type: Number },
  quantity: { type: Number },
  image: { type: String },
  materials: [MaterialSchema],
});

// Order Schema (Buyurtma ma'lumotlari)
const InfoSchema = new mongoose.Schema(
  {
    paid: { type: Number, required: true },
    date: { type: Date, required: true },
    estimatedDays: { type: Number, required: true },
    customer: { type: CustomerSchema, required: true },
    address: { type: OrderAddressSchema, required: true },
    isType: { type: Boolean, default: true },
    isActive: { type: Boolean, default: false },
    description: { type: String },
    orders: { type: [OrderSchema], default: [] }, // Array qilib belgilash kerak
  },
  { timestamps: true }
);

// Model yaratish
const MaterialGiven = mongoose.model("MaterialGiven", MaterialGivenSchema);
const Order = mongoose.model("Order", InfoSchema);

// Eksport qilish
module.exports = { Order, MaterialGiven };


