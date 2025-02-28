const storeDB = require("../model/storeModel");
const response = require("../utils/response");
const mongoose = require("mongoose");

class StoreController {
  async createStore(req, res) {
    try {
      let io = req.app.get("socket");
      const data = req.body;
      const store = await storeDB.create({
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit,
        supplier: data.supplier,
      });

      if (!store) return response.error(res, "Mahsulot qo'shilmadi");

      response.created(res, "Mahsulot qo'shildi", store);
      io.emit("newStore", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async updateStore(req, res) {
    try {
      let io = req.app.get("socket");
      const { id, } = req.params;
      const data = req.body;

      let store = await storeDB.findById(id);

      store.quantity = data.quantity || 0;
      store.name = data.name || store.name;
      store.category = data.category || store.category;
      store.pricePerUnit = data.pricePerUnit || store.pricePerUnit;
      store.unit = data.unit || store.unit;
      store.supplier = data.supplier || store.supplier;
      await store.save();

      response.success(res, "Mahsulot yangilandi", store);
      io.emit("newStore", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getStore(req, res) {
    try {
      let store = await storeDB.find();
      if (!store) return response.notFound(res, "Mahsulotlar topilmadi");
      response.success(res, "Mahsulotlar topildi", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async deleteStore(req, res) {
    try {
      let io = req.app.get("socket");
      const store = await storeDB.findByIdAndDelete(req.params.id);
      if (!store) return response.error(res, "Mahsulot o'chirilishda xatolik");
      response.success(res, "Mahsulot o'chirildi", store);
      io.emit("newStore", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getStoreByCategory(req, res) {
    try {
      let store = await storeDB.find({ category: req.params.category });
      if (!store) return response.notFound(res, "Mahsulotlar topilmadi");
      response.success(res, "Mahsulotlar topildi", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async decrementQuantity(req, res) {
    try {
      let io = req.app.get("socket");
      const store = await storeDB.findByIdAndUpdate(req.params.id, {
        $inc: { quantity: -1 },
      });
      if (!store) return response.notFound(res, "Mahsulot topilmadi");
      response.success(res, "Mahsulot omborda ayirildi", store);
      io.emit("newStore", store);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
  // 3. Read (ID bo'yicha ma'lumot o'qish)
  // Controller
  async getStoreById(req, res) {
    try {
      const store = await storeDB.findOne({ _id: req.params.id }); // findOne ishlatildi
      if (!store) {
        return response.notFound(res, "Store not found");
      }
      response.success(res, "Store fetched successfully", store);
    } catch (error) {
      response.serverError(res, error.message);
    }
  }

  async storeUpdateMany(req, res) {
    try {
      let io = req.app.get("socket");
      const updates = req.body; // array keladi

      if (!Array.isArray(updates) || updates.length === 0)
        return response.error(res, "Yangilash uchun mahsulotlar yo‘q!");

      const bulkOps = updates.map((data) => {
        if (!mongoose.Types.ObjectId.isValid(data.productId)) {
          // ❗ Noto‘g‘ri yoki berilmagan ID bo‘lsa, yangi mahsulot yaratamiz
          return {
            insertOne: {
              document: {
                name: data.name,
                category: data.category,
                quantity: data.quantity || 0,
                pricePerUnit: data.pricePerUnit,
                unit: data.unit,
                supplier: data.supplier,
              },
            },
          };
        } else {
          // ✅ To‘g‘ri ID bo‘lsa, mavjud mahsulotni yangilaymiz yoki yaratamiz
          return {
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(data.productId) },
              update: {
                $set: {
                  name: data.name,
                  category: data.category,
                  pricePerUnit: data.pricePerUnit,
                  unit: data.unit,
                  supplier: data.supplier,
                },
                $inc: { quantity: data.quantity || 0 },
              },
              upsert: true, // ❗ Agar mahsulot topilmasa, yangisini yaratadi
            },
          };
        }
      });

      if (bulkOps.length > 0) {
        await storeDB.bulkWrite(bulkOps);
      }

      response.success(res, "Mahsulotlar omborga qo‘shildi yoki yangilandi!");
      io.emit("newStore", store);
    } catch (err) {
      console.error(err);
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new StoreController();
