const storeDB = require("../model/storeModel");
const { Order, MaterialGiven } = require("../model/orderSchema");
const response = require("../utils/response");
const moment = require('moment');
const mongoose = require("mongoose");
const Orderlist = require("../model/shopsOrderList");
class StoreController {


  async createStore(req, res) {
    const { name, category, unit, quantity, pricePerUnit, supplier } = req.body;

    try {
      const existingItem = await storeDB.findOne({ name, category });
      if (existingItem) {
        // Mavjud qiymatlar
        const oldQty = existingItem.quantity;
        const oldPrice = existingItem.pricePerUnit;
        const oldTotal = oldQty * oldPrice;

        const newTotal = quantity * pricePerUnit;

        const updatedQty = oldQty + quantity;
        const updatedTotal = oldTotal + newTotal;

        const averagePrice = updatedTotal / updatedQty;

        // Yangilash uchun faqat zarur maydonlarni aniqlaymiz
        const updatedFields = {
          quantity: updatedQty,
          pricePerUnit: Math.round(averagePrice),
          supplier,
        };

        const updatedItem = await storeDB.findByIdAndUpdate(
          existingItem._id,
          { $set: updatedFields },
          { new: true }
        );

        return response.created(res, "Yangi mahsulot omborga qo‘shildi", updatedItem);

      }

      // Yangi mahsulot qo‘shish
      const newItem = await storeDB.create({
        name,
        category,
        unit,
        quantity,
        pricePerUnit,
        supplier,
      });
      return response.created(res, "Yangi mahsulot omborga qo‘shildi", newItem);
    } catch (err) {
      response.serverError(res, "Server xatosi", err);
    }
  };

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


  // GET /api/report?month=4&year=2025
  async getStoreReport(req, res) {
    try {
      const now = moment();
      const month = parseInt(req.query.month) || now.month(); // 0-based
      const year = parseInt(req.query.year) || now.year();

      const startDate = moment.utc().year(year).month(month).startOf("month").toDate();
      const endDate = moment.utc().year(year).month(month).endOf("month").add(1, "second").toDate();

      // 1. Kirim (Orderlist -> materials orqali)
      const orders = await Orderlist.find({
        createdAt: { $gte: startDate, $lt: endDate }
      });

      let totalIncoming = 0;
      orders?.forEach(order => {
        order.materials?.forEach(material => {
          totalIncoming += (material.pricePerUnit || 0) * (material.quantity || 0);
        });
      });

      // 2. Chiqim (MaterialGiven)
      const givens = await MaterialGiven.find({
        date: { $gte: startDate, $lt: endDate }
      });

      let totalOutgoing = 0;
      givens?.forEach(given => {
        totalOutgoing += (given.price || 0) * (given.givenQuantity || 0);
      });

      // 3. Omborda qolgan jami mahsulotlar soni (storeDB)
      const allStoreItems = await storeDB.find({});
      let totalRemaining = 0;
      allStoreItems?.forEach(item => {
        totalRemaining += (item.pricePerUnit || 0) * (item.quantity || 0);
      });
      // Yakuniy hisobot
      const myData = {
        month: month + 1,
        year,
        totalIncoming,         // kirim
        totalOutgoing,         // chiqim
        net: totalIncoming - totalOutgoing, // farq
        totalRemaining,        // ombordagi qolgan mahsulotlar soni
      };

      response.success(res, "Ombor hisobotlari", myData);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }



}

module.exports = new StoreController();
