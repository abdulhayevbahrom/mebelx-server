const Salary = require("../model/salarySchema");
const response = require("../utils/response");

class salaryController {
    // Yangi oylik yoki avans qo‘shish
    static async createSalary(req, res) {
        try {
            const { workerId, date, salaryType, amount } = req.body;

            if (!workerId || !salaryType || !amount) {
                return response.error(res, "Barcha maydonlarni to'ldiring");
            }

            const salary = new Salary({ workerId, date, salaryType, amount });
            await salary.save();

            return response.created(res, "Ma'lumot muvaffaqiyatli qo‘shildi", salary);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error.message);
        }
    }

    // Barcha oyliklarni olish
    static async getAllSalaries(req, res) {
        try {
            const salaries = await Salary.find().populate("workerId", "name");
            return response.success(res, "Barcha ma'lumotlar", salaries);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error.message);
        }
    }

    // ID orqali bitta oylik yoki avansni olish
    static async getSalaryById(req, res) {
        try {
            const { id } = req.params;
            const salary = await Salary.findById(id).populate("workerId", "name");

            if (!salary) return response.notFound(res, "Ma'lumot topilmadi");

            return response.success(res, "Ma'lumot topildi", salary);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error.message);
        }
    }

    // Oylik yoki avansni yangilash
    static async updateSalary(req, res) {
        try {
            const { id } = req.params;
            const { workerId, date, salaryType, amount } = req.body;

            const updatedSalary = await Salary.findByIdAndUpdate(
                id,
                { workerId, date, salaryType, amount },
                { new: true }
            );

            if (!updatedSalary) return response.notFound(res, "Ma'lumot topilmadi");

            return response.success(res, "Ma'lumot yangilandi", updatedSalary);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error.message);
        }
    }

    // Oylik yoki avansni o‘chirish
    static async deleteSalary(req, res) {
        try {
            const { id } = req.params;
            const deletedSalary = await Salary.findByIdAndDelete(id);

            if (!deletedSalary) return response.notFound(res, "Ma'lumot topilmadi");

            return response.success(res, "Ma'lumot o‘chirildi", deletedSalary);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error.message);
        }
    }
}

module.exports = salaryController;
