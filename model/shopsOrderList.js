const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    productId: { type: String },
    name: { type: String },
    category: { type: String },
    pricePerUnit: { type: Number },
    quantity: { type: Number },
    unit: { type: String },
    supplier: { type: String }
}, { _id: true }); // _id: true avtomatik o'ziga ID beradi

const orderSchema = new mongoose.Schema({
    shopName: { type: String, default: "" },
    isPaid: { type: Boolean, default: false },
    paid: { type: Number, default: 0 },
    returnedMoney: { type: Number, default: 0 },
    returnedState: { type: Boolean, default: false }, // Oshiqcha pul qaytarildimi yoki yoq: returnedState: false   da  pul qaytarilmadi hali
    returnedPaid: { type: Number, default: 0 },
    isType: { type: Boolean, default: true },
    totalPrice: { type: Number },
    shopsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shops",
    },
    materials: [materialSchema],
}, {
    timestamps: { currentTime: () => Date.now() + 5 * 60 * 1000 },
});



const Orderlist = mongoose.model('Orderlist', orderSchema);

module.exports = Orderlist;






