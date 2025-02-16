const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema(
    {
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);

const Balance = mongoose.model("Balance", balanceSchema);

module.exports = Balance;
