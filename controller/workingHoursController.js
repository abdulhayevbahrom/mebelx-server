const WorkingHours = require("../model/workingHours");
const Response = require("../utils/response");

class WorkingHoursController {
    // 1. Create (Yaratish)
    async createWorkingHours(req, res) {
        try {
            const { wages, overtimeWages, workingHours, voxa, toshkent, vodiy } = req.body;


            // Check if working hours data already exists
            const existingWorkingHours = await WorkingHours.findOne();
            if (existingWorkingHours) {
                return Response.badRequest(res, "Ish Haqqi va Ish Vaqti mavjud. Yangilanish uchun foydalaning.");
            }

            // Create new Working Hours entry
            const newWorkingHours = new WorkingHours({
                wages,
                overtimeWages,
                workingHours,
                voxa,
                toshkent,
                vodiy,
            });

            await newWorkingHours.save();

            // Return success response
            Response.created(res, "Ish Haqqi va Ish Vaqti muvaffaqiyatli yaratildi.", newWorkingHours);
        } catch (error) {
            // Return server error response
            Response.serverError(res, `Xatolik yuz berdi: ${error.message}`);
        }
    }

    // 2. Read (Barcha ma'lumotlarni o'qish)
    async getAllWorkingHours(req, res) {
        try {
            const workingHours = await WorkingHours.find();
            Response.success(res, "Working hours fetched successfully", workingHours);
        } catch (error) {
            Response.serverError(res, error.message);
        }
    }

    // 3. Read (ID bo'yicha ma'lumot o'qish)
    async getWorkingHoursById(req, res) {
        try {
            const { id } = req.params;
            const workingHours = await WorkingHours.findById(id);
            if (!workingHours) {
                return Response.notFound(res, "Working hours not found");
            }
            Response.success(res, "Working hours fetched successfully", workingHours);
        } catch (error) {
            Response.serverError(res, error.message);
        }
    }

    // 4. Update (Yangilash)
    async updateWorkingHours(req, res) {
        try {
            const { id } = req.params;
            const { wages, workingHours } = req.body;
            const updatedWorkingHours = await WorkingHours.findByIdAndUpdate(
                id,
                { wages, workingHours },
                { new: true }
            );
            if (!updatedWorkingHours) {
                return Response.notFound(res, "Working hours not found");
            }
            Response.success(res, "Working hours updated successfully", updatedWorkingHours);
        } catch (error) {
            Response.serverError(res, error.message);
        }
    }

    // 5. Delete (O'chirish)
    async deleteWorkingHours(req, res) {
        try {
            const { id } = req.params;
            const deletedWorkingHours = await WorkingHours.findByIdAndDelete(id);
            if (!deletedWorkingHours) {
                return Response.notFound(res, "Working hours not found");
            }
            Response.success(res, "Working hours deleted successfully");
        } catch (error) {
            Response.serverError(res, error.message);
        }
    }
}

module.exports = new WorkingHoursController();
