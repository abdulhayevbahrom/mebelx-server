const mongoose = require('mongoose');

// Materiallar uchun sxema (har bir materialning tuzilishi)
const materialSchema = new mongoose.Schema({
    productId: { type: String }, // Mahsulot ID si
    name: { type: String }, // Mahsulot nomi
    category: { type: String }, // Mahsulot kategoriyasi
    pricePerUnit: { type: Number }, // Birlik narxi
    quantity: { type: Number }, // Miqdori
    unit: { type: String }, // O'lchov birligi
    supplier: { type: String } // Yetkazib beruvchi
}, { _id: true }); // Avtomatik _id maydoni yaratiladi

// Buyurtmalar uchun sxema
const orderSchema = new mongoose.Schema({
    shopName: { type: String, default: "" }, // Do'kon nomi, bo'sh bo'lsa bo'ladi
    isPaid: { type: Boolean, default: false }, // To'lov holati, sukut bo'yicha false
    paid: { type: Number, default: 0 }, // To'langan summa
    returnedMoney: { type: Number, default: 0 }, // Qaytarilgan pul
    returnedState: { type: Boolean, default: false }, // Oshiqcha pul qaytarildi yoki yo'q
    returnedPaid: { type: Number, default: 0 }, // Qaytarilgan to'lov summasi
    isType: { type: Boolean, default: true }, // Turi, sukut bo'yicha true
    totalPrice: { type: Number }, // Umumiy narx
    shopsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shops" // Do'konlarga havola, majburiy emas
    },
    materials: [materialSchema] // Materiallar ro'yxati, majburiy emas
}, {
    timestamps: { currentTime: () => Date.now() + 5 * 60 * 1000 } // Vaqt belgilari, +5 daqiqa
});

// Modelni yaratish
const Orderlist = mongoose.model('Orderlist', orderSchema);

// Modelni eksport qilish
module.exports = Orderlist;