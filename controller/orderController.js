const { MaterialGiven, Order } = require("../model/orderSchema");
const StoreModel = require("../model/storeModel");
const response = require("../utils/response"); // Response class'ni import qilamiz
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;


class OrderController {

  // Barcha buyurtmalarni olish
  static async getOrders(req, res) {
    try {
      const orders = await Order.find();
      return response.success(res, "Buyurtmalar muvaffaqiyatli olindi", orders);
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }


  static async getOrderById(req, res) {
    try {
      // Find the order by ID
      const order = await Order.findById(req.params.id);
      if (!order) return response.notFound(res, "Buyurtma topilmadi");

      // Convert order to plain object
      const orderData = order.toObject();

      // Fetch MaterialGiven documents and map them to the corresponding orders
      const orderIds = orderData.orders.map((orderItem) => orderItem._id);
      const materialsGiven = await MaterialGiven.find({
        orderCardId: { $in: orderIds },
      });

      // Add materialsGiven to each order in the orders array
      orderData.orders = orderData.orders.map((orderItem) => {
        const relatedMaterials = materialsGiven.filter(
          (material) => material.orderCardId.toString() === orderItem._id.toString()
        );
        return {
          ...orderItem,
          materialsGiven: relatedMaterials,
        };
      });

      return response.success(res, "Buyurtma muvaffaqiyatli olindi", orderData);
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  };

  // Buyurtmani o‘chirish
  static async deleteOrderIntoInfo(req, res) {
    try {
      const { infoId, orderId } = req.params;

      if (!infoId || !orderId) {
        return response.badRequest(res, 'infoId va orderId maydonlari kerak');
      }

      if (!mongoose.isValidObjectId(infoId) || !mongoose.isValidObjectId(orderId)) {
        return response.badRequest(res, 'Noto‘g‘ri infoId yoki orderId formati');
      }

      const info = await Order.findById(infoId);
      if (!info) {
        return response.notFound(res, 'Info hujjati topilmadi');
      }

      const orderIndex = info.orders.findIndex(order => order._id.toString() === orderId);
      if (orderIndex === -1) {
        return response.notFound(res, 'Buyurtma topilmadi');
      }

      info.orders.splice(orderIndex, 1);
      await info.save();

      return response.success(res, 'Buyurtma muvaffaqiyatli o‘chirildi', info);
    } catch (error) {
      console.error('Buyurtma o‘chirishda xatolik:', error);
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  // Buyurtma qo‘shish
  static async createOrderIntoInfo(req, res) {
    try {
      const { infoId } = req.params;
      const {
        name,
        length,
        width,
        height,
        quantity,
        originalPrice,
        budget,
        description,
      } = req.body;
      const file = req.file;

      if (!infoId || !file) {
        return response.badRequest(res, 'infoId va rasm kerak');
      }

      const processedImage = await sharp(file.buffer)
        .resize({ width: 500, height: 500, fit: "cover" })
        .jpeg({ quality: 90 })
        .toBuffer();

      const base64Image = processedImage.toString("base64");

      const formData = new FormData();
      formData.append("image", base64Image);

      const api = `${process.env.IMAGE_BB_API_URL}?key=${process.env.IMAGE_BB_API_KEY}`;
      let uploadedUrl;

      try {
        const resImg = await axios.post(api, formData, {
          headers: formData.getHeaders(),
        });

        uploadedUrl = resImg?.data?.data?.url;
        if (!uploadedUrl) {
          throw new Error('Rasmni yuklashda xatolik: URL topilmadi');
        }
      } catch (uploadError) {
        console.error('ImgBB upload error:', uploadError.message);
        return response.serviceUnavailable(res, 'Rasmni yuklashda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko‘ring.', uploadError.message);
      }

      const orderData = {
        name,
        dimensions: {
          length: +length,
          width: +width,
          height: +height,
        },
        quantity: +quantity,
        originalPrice: +originalPrice,
        budget: +budget,
        description,
        image: uploadedUrl,
      };

      const info = await Order.findById(infoId);
      if (!info) {
        return response.notFound(res, 'Info hujjati topilmadi');
      }

      info.orders.unshift(orderData);
      await info.save();

      return response.created(res, 'Buyurtma muvaffaqiyatli qo‘shildi', info);
    } catch (error) {
      console.error('Buyurtma qo‘shishda xatolik:', error);
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }


  static async createOrder(req, res) {
    try {
      const data = JSON.parse(JSON.stringify(req.body));

      data.paid = +data.paid;
      data.estimatedDays = +data.estimatedDays;
      data.nds = +data.nds;

      for (let i = 0; i < data.orders.length; i++) {
        const file = req.files[i];
        if (!file) continue;

        try {
          const processedImage = await sharp(file.buffer)
            .resize({ width: 500, height: 500, fit: "cover" })
            .jpeg({ quality: 90 })
            .toBuffer();

          const base64Image = processedImage.toString("base64");

          const formData = new FormData();
          formData.append("image", base64Image);

          const api = `${process.env.IMAGE_BB_API_URL}?key=${process.env.IMAGE_BB_API_KEY}`;

          const response = await axios.post(api, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          if (response?.data?.data?.url) {
            data.orders[i].image = response.data.data.url;
          }
        } catch (err) {
          return response.error(
            res,
            "Rasm yuklashda xatolik",
            err?.response?.data || err.message
          );
        }
      }

      data.orders = data.orders.map((item) => ({
        name: item.name,
        budget: +item.budget,
        quantity: +item.quantity,
        dimensions: {
          length: +item.dimensions?.length,
          width: +item.dimensions?.width,
          height: +item.dimensions?.height,
        },
        image: item.image,
        description: item.description,
        originalPrice: +item.originalPrice,
      }));

      // **Yangi buyurtmani yaratish**
      const newOrder = await Order.create(data);
      if (!newOrder) return response.error(res, "Buyurtma yaratishda xatolik");

      response.success(res, "Buyurtma muvaffaqiyatli yaratildi", newOrder);

      // const io = req.app.get("socket");
      // io.emit("newOrder", newOrder);
    } catch (error) {
      response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  // Buyurtmani yangilash
  static async updateOrder(req, res) {
    try {
      const io = req.app.get("socket");
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!updatedOrder) return response.notFound(res, "Buyurtma topilmadi");
      io.emit("updateOrder", updatedOrder);

      return response.success(
        res,
        "Buyurtma muvaffaqiyatli yangilandi",
        updatedOrder
      );
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  // Buyurtmani o‘chirish
  static async deleteOrder(req, res) {
    try {
      const io = req.app.get("socket");
      const deletedOrder = await Order.findByIdAndDelete(req.params.id);
      if (!deletedOrder)
        return response.notFound(res, "Buyurtma topilmadi", deletedOrder);
      io.emit("newOrder", deletedOrder);
      return response.success(res, "Buyurtma muvaffaqiyatli o'chirildi");
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  // Omborchi material berdi
  static giveMaterial = async (req, res) => {
    try {
      const { orderCardId, price, orderId, materialName, givenQuantity } = req.body;

      // Buyurtmani topish
      const order = await Order.findById(orderId);
      if (!order) return response.notFound(res, "Buyurtma topilmadi");

      // Omborda borligini tekshirish
      const storeMaterial = await StoreModel.findOne({ name: materialName });
      if (!storeMaterial)
        return response.notFound(res, "Material omborda mavjud emas");

      // Ombordagi yetarlilikni tekshirish
      if (storeMaterial.quantity < givenQuantity) {
        return response.error(
          res,
          `Omborda yetarli material yo‘q! Hozirda faqat ${storeMaterial.quantity} ${storeMaterial.unit} mavjud.`,
          {
            availableQuantity: storeMaterial.quantity,
            unit: storeMaterial.unit,
          }
        );
      }
      const orderCardIdAsObjectId = new ObjectId(orderCardId);
      const findedMaterial = order.orders.find((m) =>
        m._id.equals(orderCardIdAsObjectId)
      );
      const material = findedMaterial.materials.find(
        (i) => i.name === materialName
      );

      if (!material)
        return response.notFound(
          res,
          "Buyurtma ichida bunday material mavjud emas"
        );

      storeMaterial.quantity -= givenQuantity;
      await storeMaterial.save();

      // Omborchi bergan materialni saqlash
      const givenMaterial = new MaterialGiven({
        orderId,
        materialName,
        price,
        givenQuantity,
        orderCardId,
        materialId: material?._id,
        unit: material.unit || storeMaterial.unit, // `unit` saqlanadi
      });

      await givenMaterial.save();

      return response.success(
        res,
        `Material muvaffaqiyatli berildi: ${givenQuantity} ${material.unit || storeMaterial.unit
        }!`,
        givenMaterial
      );
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  };

  // Omborchi material berdi
  static giveMaterialSoldo = async (req, res) => {
    try {
      const { orderCardId, orderId, materialName, givenQuantity, price } = req.body;

      // Kirish ma'lumotlarini tekshirish
      if (!orderId || !materialName || !givenQuantity || !price) {
        return response.badRequest(res, "Majburiy maydonlar kiritilmagan");
      }

      // Parallel ravishda ma'lumotlarni olish va xatolarni boshqarish
      const [order, storeMaterial] = await Promise.all([
        Order.findById(orderId).orFail(() => new Error("Buyurtma topilmadi")),
        StoreModel.findOne({ name: materialName }).orFail(() => new Error("Material topilmadi"))
      ]);

      // Berilgan material yozuvini yaratish va saqlash
      const givenMaterial = await new MaterialGiven({
        orderId,
        orderCardId,
        materialId: storeMaterial._id,
        materialName,
        givenQuantity,
        unit: storeMaterial.unit,
        price
      }).save();

      return response.success(
        res,
        `Material muvaffaqiyatli berildi: ${givenQuantity} ${givenMaterial.unit}`,
        givenMaterial
      );
    } catch (error) {
      return response.serverError(res, error.message || "Serverda xatolik yuz berdi", error);
    }
  };

  static orderProgress = async (req, res) => {
    try {
      const { orderId } = req.params;

      // Buyurtmani topish
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Buyurtma topilmadi" });
      }

      // orders array ichidagi orderCardId larni olish
      const orderCardIds = order.orders.map((item) => item._id.toString());

      // Umumiy kerak bo'lgan materiallar miqdorini topish
      const totalRequired = order.orders.reduce((sum, orderItem) => {
        return (
          sum +
          orderItem.materials.reduce(
            (materialSum, material) => materialSum + material.quantity,
            0
          )
        );
      }, 0);

      // Berilgan materiallarni orderCardId bo'yicha yig'ish
      const givenMaterials = await MaterialGiven.aggregate([
        { $match: { orderCardId: { $in: orderCardIds } } },
        { $group: { _id: null, totalGiven: { $sum: "$givenQuantity" } } },
      ]);

      const totalGiven =
        givenMaterials.length > 0 ? givenMaterials[0].totalGiven : 0;

      // Umumiy foiz hisoblash
      const percentage =
        totalRequired > 0 ? ((totalGiven / totalRequired) * 100).toFixed(2) : 0;

      return res.json({
        message: "Umumiy materiallar ta'minlanish foizi",
        percentage: +percentage,
      });
    } catch (error) {
      return res.status(500).json({ message: "Server xatosi", error });
    }
  };

  static getMaterialById = async (req, res) => {
    try {
      const { orderId, materialId } = req.params;

      // `MaterialGiven` dan orderId va materialId bo‘yicha barcha yozuvlarni olish
      const givenMaterials = await MaterialGiven.find({ orderId, materialId });

      if (!givenMaterials.length) {
        return response.notFound(res, "Materiallar topilmadi");
      }

      // `givenQuantity` larni qo‘shib umumiy miqdorni hisoblash
      const totalQuantity = givenMaterials.reduce(
        (sum, item) => sum + item.givenQuantity,
        0
      );

      res.status(200).json({
        message: "Ma'lumot topildi",
        totalQuantity, // Umumiy berilgan miqdor
        materials: givenMaterials, // Hammasini jo‘natish
      });
    } catch (error) {
      return response.serverError(res, "Server xatosi", error);
    }
  };

  // Buyurtmaga tegishli barcha materiallarni olish
  static async getAllMaterialById(req, res) {
    try {
      const { orderId } = req.params;
      const materials = await MaterialGiven.find({ orderId });
      if (!materials.length)
        return response.notFound(res, "Materiallar topilmadi");
      return response.success(res, "Materiallar topildi", materials);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error);
    }
  }

  static async calculateDebt(req, res) {
    try {
      const totalDebt = await Order.aggregate([
        {
          $match: { isType: true, isActive: true }, // 1. isType: true bo'lgan mijozlarni tanlash
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: "$paid" }, // 2. Topilgan barcha paid qiymatlarini yig'ish
            totalBudget: { $sum: { $sum: "$orders.budget" } }, // 3. orders massivining budget maydonlarini yig'ish
          },
        },
        {
          $project: {
            _id: 0,
            totalDebt: { $subtract: ["$totalBudget", "$totalPaid"] }, // 4. Qarzni hisoblash (totalBudget - totalPaid)
          },
        },
      ]);

      const debtAmount = totalDebt.length > 0 ? totalDebt[0].totalDebt : 0;

      // Pul birligi formati bilan chiqarish
      const formattedDebt = new Intl.NumberFormat("uz-UZ", {
        style: "currency",
        currency: "UZS",
        minimumFractionDigits: 0,
      }).format(debtAmount);

      return response.success(
        res,
        "isType: true bo'lgan mijozlarning umumiy qarzi:",
        formattedDebt
      );
    } catch (error) {
      return response.serverError(res, "Server xatosi", error);
    }
  }

  // get debtor orders
  static async getDebtorOrders(req, res) {
    try {
      const debtors = await Order.aggregate([
        { $match: { isType: true, isActive: true } }, // isType: true bo'lganlarni olish
        {
          $addFields: {
            totalBudget: { $sum: "$orders.budget" }, // orders array ichidagi budget yig'indisi
          },
        },
        { $match: { $expr: { $lt: ["$paid", "$totalBudget"] } } }, // paid < totalBudget bo'lganlarni olish
      ]);

      if (!debtors.length)
        return response.notFound(res, "Qarzdor mijozlar topilmadi");

      return response.success(res, "Qarzdor mijozlar ro'yxati", debtors);
    } catch (error) {
      return response.serverError(
        res,
        "Qarzdor mijozlarni olishda xatolik",
        error
      );
    }
  }

  static createAdditionalMaterial = async (req, res) => {
    try {
      const { orderId, orderCardId, name, quantity, price, unit, materialID } =
        req.body;
      // orderId mavjudligini tekshirish
      const order = await Order.findById(orderId);
      if (!order) {
        response.notFound(res, "Buyurtma (orderId) topilmadi");
      }

      // orderCardId mavjudligini tekshirish
      const orderCard = order.orders.find(
        (card) => card._id.toString() === orderCardId
      );
      if (!orderCard) {
        response.notFound(res, "Buyurtma kartasi (orderCardId) topilmadi");
      }

      // Materialni orderCard ga qo'shish
      const newMaterial = {
        name,
        quantity,
        price,
        unit,
        materialID,
      };

      orderCard.materials.push(newMaterial);

      // Buyurtmani yangilash
      await order.save();

      response.success(res, "Material muvaffaqiyatli qo'shildi", newMaterial);
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  };

  static completeOrder = async (req, res) => {
    try {
      const { orderId } = req.body;

      // 1. Buyurtmani olish
      const order = await Order.findById(orderId);
      if (!order) {
        return { success: false, message: "Order topilmadi!" };
      }

      // 2. MaterialGiven dan tegishli buyurtmalarni olish
      const givenMaterials = await MaterialGiven.find({ orderId });

      // 3. Har bir berilgan materialni tekshiramiz
      givenMaterials.forEach((given) => {
        order.orders.forEach((orderItem) => {
          orderItem.materials.forEach((material) => {
            if (material._id.toString() === given.materialId.toString()) {
              // **quantity ni har doim givenQuantity ga tenglashtiramiz**
              material.quantity = given.givenQuantity;
            }
          });
        });
      });
      order.isType = false;
      // 4. Yangilangan orderni saqlaymiz
      await order.save();

      return response.success(res, "Order materiallari yangilandi!", order);
    } catch (error) {
      return response.serverError(res, error.message);
    }
  };

  static async updateMaterialGiven(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { value } = req.body;
      const { orderId, materialId, orderCardId } = req.params;

      if (!orderId || !materialId || !orderCardId || !value) {
        await session.abortTransaction();
        return response.error(res, "Majburiy maydonlar yetishmayapti: orderId, materialId, orderCardId yoki value");
      }

      if (!ObjectId.isValid(orderId) || !ObjectId.isValid(materialId)) {
        await session.abortTransaction();
        return response.error(res, "orderId yoki materialId formati noto‘g‘ri");
      }

      const subtractValue = parseFloat(value);
      if (isNaN(subtractValue) || subtractValue <= 0) {
        await session.abortTransaction();
        return response.error(res, "Value haqiqiy musbat son bo‘lishi kerak");
      }

      const materialGiven = await MaterialGiven.findOne({ orderId, materialId, orderCardId }).session(session);
      if (!materialGiven) {
        await session.abortTransaction();
        return response.notFound(res, "MaterialGiven hujjati topilmadi");
      }

      const storeItem = await StoreModel.findById(materialId).session(session);
      if (!storeItem) {
        await session.abortTransaction();
        return response.notFound(res, "Ombor materiali topilmadi");
      }

      const newGivenQuantity = Math.max(0, materialGiven.givenQuantity - subtractValue);
      await StoreModel.findByIdAndUpdate(
        materialId,
        { $inc: { quantity: subtractValue } },
        { session }
      );

      let result;
      if (newGivenQuantity === 0) {
        await MaterialGiven.deleteOne({ orderId, materialId, orderCardId }, { session });
        result = { message: "givenQuantity 0 ga teng bo‘lgani uchun MaterialGiven o‘chirildi", data: null };
      } else {
        const updatedMaterialGiven = await MaterialGiven.findOneAndUpdate(
          { orderId, materialId, orderCardId },
          { $set: { givenQuantity: newGivenQuantity, date: new Date() } },
          { new: true, session }
        );
        result = { message: "Material muvaffaqiyatli yangilandi", data: updatedMaterialGiven };
      }

      await session.commitTransaction();
      return response.success(res, result.message, result.data);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating MaterialGiven:", error);
      return response.serverError(res, "Ichki server xatosi");
    } finally {
      session.endSession();
    }
  }


  static async editGivnMaterial(req, res) {
    const { id } = req.params; // MaterialGiven document ID
    const { quantity } = req.body; // New quantity from frontend

    try {
      // Start a MongoDB session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      // Find the MaterialGiven document by ID
      const materialGiven = await MaterialGiven.findById(id).session(session);
      if (!materialGiven) {
        await session.abortTransaction();
        session.endSession();
        return response.notFound(res, "MaterialGiven not found");
      }

      // Find the WarehouseItem by materialName
      const warehouseItem = await StoreModel.findOne({
        name: materialGiven.materialName
      }).session(session);

      if (!warehouseItem) {
        await session.abortTransaction();
        session.endSession();
        return response.notFound(res, "WarehouseItem not found");
      }

      // Check if quantity equals materialGiven.givenQuantity
      if (quantity === materialGiven.givenQuantity) {
        // Restore the previous quantity to WarehouseItem
        warehouseItem.quantity += materialGiven.givenQuantity;
        await warehouseItem.save({ session });

        // Delete the MaterialGiven document
        await MaterialGiven.findByIdAndDelete(id).session(session);

        // Check if WarehouseItem quantity is now 0
        if (warehouseItem.quantity === 0) {
          // Find all MaterialGiven documents with this materialId
          const materialGivenDocs = await MaterialGiven.find({ materialId: warehouseItem._id }).session(session);

          // Sum up all givenQuantities to restore to WarehouseItem
          const totalRestoredQuantity = materialGivenDocs.reduce((sum, doc) => sum + doc.givenQuantity, 0);

          // Restore the total givenQuantities to WarehouseItem
          warehouseItem.quantity += totalRestoredQuantity;
          await warehouseItem.save({ session });

          // Delete all MaterialGiven documents associated with this materialId
          await MaterialGiven.deleteMany({ materialId: warehouseItem._id }).session(session);
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        return response.success(res, "MaterialGiven deleted and quantity restored to warehouse", null);
      }

      // Original logic for quantity update
      const previousQuantity = materialGiven.givenQuantity;
      const quantityDifference = quantity - previousQuantity;

      // Check if sufficient quantity is available in WarehouseItem
      if (warehouseItem.quantity < quantityDifference) {
        await session.abortTransaction();
        session.endSession();
        return response.error(res, "Insufficient quantity in warehouse");
      }

      // Update WarehouseItem quantity: restore previous and subtract new
      warehouseItem.quantity += previousQuantity; // Restore previous quantity
      warehouseItem.quantity -= quantity; // Subtract new quantity
      await warehouseItem.save({ session });

      // Update MaterialGiven with new givenQuantity
      materialGiven.givenQuantity = quantity;
      await materialGiven.save({ session });

      // Check if WarehouseItem quantity is now 0
      if (warehouseItem.quantity === 1) {
        const materialGivenDocs = await MaterialGiven.find({ materialId: warehouseItem._id }).session(session);
        const totalRestoredQuantity = materialGivenDocs.reduce((sum, doc) => sum + doc.givenQuantity, 0);

        // Restore the total givenQuantities to WarehouseItem
        warehouseItem.quantity += totalRestoredQuantity;
        await warehouseItem.save({ session });

        // Delete all MaterialGiven documents associated with this materialId
        await MaterialGiven.deleteMany({ materialId: warehouseItem._id }).session(session);
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return response.success(res, "Maxsulot muvaffaqiyatli omborga qaytarildi", materialGiven);
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      session.endSession();
      return response.serverError(res, error.message);
    }
  }
}

module.exports = OrderController;
