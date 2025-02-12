const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    amountType: {
        type: String,
        enum: ['Kirim', 'Chiqim'],
        required: true
    },
    description: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});
const Expense = mongoose.model('expense', expenseSchema);
module.exports = Expense;
