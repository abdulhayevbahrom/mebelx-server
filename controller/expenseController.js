const Expense = require('../model/expense');
const response = require('../utils/response'); // Assuming the response class is in the utils folder
const moment = require('moment'); // For date manipulation

class ExpenseController {
    // Yangi expense qo'shish
    async createExpense(req, res) {
        try {

            const newExpense = new Expense(req.body);
            await newExpense.save();
            response.created(res, "Expense created successfully", newExpense);
        } catch (error) {
            response.error(res, error.message);
        }
    }

    // Barcha expenselarni olish
    async getAllExpenses(req, res) {
        try {
            const expenses = await Expense.find();
            response.success(res, "Expenses fetched successfully", expenses);
        } catch (error) {
            response.serverError(res, error.message);
        }
    }

    // Expense ni ID bo'yicha olish
    async getExpenseById(req, res) {
        try {
            const expense = await Expense.findById(req.params.id);
            if (!expense) {
                return response.notFound(res, 'Expense not found');
            }
            response.success(res, "Expense fetched successfully", expense);
        } catch (error) {
            response.serverError(res, error.message);
        }
    }

    // Expense ni yangilash
    async updateExpense(req, res) {
        try {
            const { name, amount, amountType, description } = req.body;
            const updatedExpense = await Expense.findByIdAndUpdate(
                req.params.id,
                { name, amount, amountType, description },
                { new: true }
            );
            if (!updatedExpense) {
                return response.notFound(res, 'Expense not found');
            }
            response.success(res, "Expense updated successfully", updatedExpense);
        } catch (error) {
            response.error(res, error.message);
        }
    }

    // Expense ni o'chirish
    async deleteExpense(req, res) {
        try {
            const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
            if (!deletedExpense) {
                return response.notFound(res, 'Expense not found');
            }
            response.success(res, "Expense deleted successfully");
        } catch (error) {
            response.serverError(res, error.message);
        }
    }

    // Sanalarda xarajatlarni olish
    async getExpensesByPeriod(req, res) {
        try {
            let { startDate, endDate } = req.body; // Frontenddan sanalarni olish

            // Agar sanalar kiritilmagan bo'lsa, default qiymatlarni qo'yamiz
            if (!startDate || !endDate) {
                return response.badRequest(res, "Start date and end date are required");
            }

            // Sanalarni moment orqali formatlash
            const startOfPeriod = moment(startDate, "YYYY-MM-DD").startOf("day").toDate();
            const endOfPeriod = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();

            if (startOfPeriod > endOfPeriod) {
                return response.badRequest(res, "Start date must be before end date");
            }

            // Xarajatlarni topish
            const expenses = await Expense.find({
                date: { $gte: startOfPeriod, $lte: endOfPeriod }
            }).sort({ date: 1 }); // Sanalar bo‘yicha tartiblab chiqamiz

            if (!expenses.length) {
                return response.notFound(res, "No expenses found for the given period");
            }

            // Xarajatlarni qaytarish
            return response.success(res, "Expenses fetched successfully", expenses);
        } catch (error) {
            return response.serverError(res, error.message);
        }
    }
}

module.exports = new ExpenseController;
