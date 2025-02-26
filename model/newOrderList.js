const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    productId: { type: String },
    name: { type: String },
    category: { type: String },
    pricePerUnit: { type: Number },
    quantity: { type: Number },
    unit: { type: String },
    supplier: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    totalPrice: { type: Number, default: 0 },
    materials: [materialSchema],
    isNew: { type: Boolean, default: false },
    sentToDistributor: { type: Boolean, default: false },
    addedToData: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    approvedByDistributor: { type: Boolean, default: false },
    distributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Worker",
    },
    shopsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shops",
    }
}, {
    timestamps: { currentTime: () => Date.now() + 5 * 60 * 1000 },
    suppressReservedKeysWarning: true // Ogohlantirishni o'chirish
});

orderSchema.pre('save', function (next) {
    this.totalPrice = this.materials.reduce((sum, material) => sum + (material.pricePerUnit * material.quantity), 0);
    next();
});

const Orderlist = mongoose.model('Neworderlist', orderSchema);
module.exports = Orderlist;


