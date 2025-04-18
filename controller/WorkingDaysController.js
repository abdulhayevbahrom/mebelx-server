const WorkingDays = require('../model/workingDays'); // Yo'lni moslashtiring
const response = require('../utils/response'); // Yo'lni moslashtiring

class WorkingDaysController {
    // Yangi ish kunlari yozuvini yaratish
    async create(req, res) {
        try {
            const { minthlyWorkingDay } = req.body;

            if (!minthlyWorkingDay) {
                return response.error(res, "Oylik ish kuni kiritilishi shart");
            }

            const workingDays = new WorkingDays({
                minthlyWorkingDay
            });

            const savedWorkingDays = await workingDays.save();
            return response.created(res, "Ish kunlari muvaffaqiyatli yaratildi", savedWorkingDays);
        } catch (error) {
            return response.serverError(res, "Server xatosi");
        }
    }

    // Barcha ish kunlari yozuvlarini olish
    async getAll(req, res) {
        try {
            const workingDays = await WorkingDays.find();

            if (!workingDays.length) {
                return response.notFound(res, "Ish kunlari topilmadi");
            }

            return response.success(res, "Ish kunlari muvaffaqiyatli olindi", workingDays);
        } catch (error) {
            return response.serverError(res, "Server xatosi");
        }
    }

    // Ish kunlari yozuvini o'chirish
    async delete(req, res) {
        try {
            const { id } = req.params;

            const deletedWorkingDays = await WorkingDays.findByIdAndDelete(id);

            if (!deletedWorkingDays) {
                return response.notFound(res, "Ish kunlari topilmadi");
            }

            return response.success(res, "Ish kunlari muvaffaqiyatli o'chirildi");
        } catch (error) {
            return response.serverError(res, "Server xatosi");
        }
    }

    // Ish kunlari yozuvini yangilash
    async update(req, res) {
        try {
            const { id } = req.params;
            const { minthlyWorkingDay } = req.body;

            if (!minthlyWorkingDay) {
                return response.error(res, "Oylik ish kuni kiritilishi shart");
            }

            const updatedWorkingDays = await WorkingDays.findByIdAndUpdate(
                id,
                { minthlyWorkingDay },
                { new: true, runValidators: true }
            );

            if (!updatedWorkingDays) {
                return response.notFound(res, "Ish kunlari topilmadi");
            }

            return response.success(res, "Ish kunlari muvaffaqiyatli yangilandi", updatedWorkingDays);
        } catch (error) {
            return response.serverError(res, "Server xatosi");
        }
    }
}

module.exports = new WorkingDaysController();