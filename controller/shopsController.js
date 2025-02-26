const Option = require('../model/shopsModel');
const response = require('../utils/response');

class OptionController {
    // Barcha variantlarni olish
    async getAllOptions(req, res) {
        try {
            const options = await Option.find();
            return response.success(res, "Variantlar muvaffaqiyatli olindi", options);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error);
        }
    }

    // Yangi variant qo'shish
    async addOption(req, res) {
        try {
            const { name } = req.body;
            if (!name) return response.error(res, "Nomi talab qilinadi");

            const existingOption = await Option.findOne({ name: name.trim().toLowerCase() });
            if (existingOption) return response.warning(res, "Bunday variant mavjud");

            const newOption = new Option({ name: name.trim() });
            await newOption.save();
            return response.created(res, "Yangi variant qo'shildi", newOption);
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error);
        }
    }

    // Variantni o'chirish
    async deleteOption(req, res) {
        try {
            const { id } = req.params;
            const deletedOption = await Option.findByIdAndDelete(id);
            if (!deletedOption) return response.notFound(res, "Variant topilmadi");
            return response.success(res, "Variant muvaffaqiyatli o'chirildi");
        } catch (error) {
            return response.serverError(res, "Xatolik yuz berdi", error);
        }
    }
}

module.exports = new OptionController();
