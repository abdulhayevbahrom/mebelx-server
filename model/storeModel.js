const mongoose = require("mongoose");

const warehouseItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Mahsulot nomi
    category: { type: String, required: true }, // Kategoriya (yog‘och, temir, kimyoviy)
    quantity: { type: Number, required: true, default: 0 }, // Miqdori
    unit: { type: String, required: true }, // O‘lchov birligi (dona, kg, litr)
    pricePerUnit: { type: Number, required: true }, // Birlik narxi
    supplier: { type: String }, // Yetkazib beruvchi
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WarehouseItem", warehouseItemSchema);



