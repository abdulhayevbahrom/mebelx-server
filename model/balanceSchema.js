const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema(
    {
        dollarBalance: {
            type: Number,
            required: true,
            default: 0,
        },
        bankTransferBalance: {
            type: Number,
            required: true,
            default: 0,
        },
        cashBalance: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);

const Balance = mongoose.model("Balance", balanceSchema);

module.exports = Balance;
