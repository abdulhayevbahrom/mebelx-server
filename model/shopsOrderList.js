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

// totalPrice avtomatik hisoblanishi uchun pre saqlash middleware
orderSchema.pre('save', function (next) {
    this.totalPrice = this.materials.reduce((sum, material) => sum + (material.pricePerUnit * material.quantity), 0);
    next();
});

const Orderlist = mongoose.model('Orderlist', orderSchema);
module.exports = Orderlist;
