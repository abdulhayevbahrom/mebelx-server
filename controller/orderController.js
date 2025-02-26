const { MaterialGiven, Order } = require("../model/orderSchema");
const StoreModel = require("../model/storeModel");
const response = require("../utils/response"); // Response class'ni import qilamiz
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");

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

  // Bitta buyurtmani olish
  //   // Bitta buyurtmani olish
  static async getOrderById(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return response.notFound(res, "Buyurtma topilmadi");
      return response.success(res, "Buyurtma muvaffaqiyatli olindi", order);
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  static async createOrder(req, res) {
    try {
      const data = JSON.parse(JSON.stringify(req.body));

      data.paid = +data.paid;
      data.estimatedDays = +data.estimatedDays;

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
        dimensions: {
          length: +item.dimensions.length,
          width: +item.dimensions.width,
          height: +item.dimensions.height,
        },
        image: item.image,
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
  // Omborchi material berdi
  static giveMaterial = async (req, res) => {
    try {
      const { orderId, materialName, givenQuantity } = req.body;

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

      // Buyurtmadagi materialni topish
      const material = order.materials.find((m) => m.name === materialName);
      if (!material)
        return response.notFound(
          res,
          "Buyurtma ichida bunday material mavjud emas"
        );

      // Ombordan material chiqarish
      storeMaterial.quantity -= givenQuantity;
      await storeMaterial.save();

      // Omborchi bergan materialni saqlash
      const givenMaterial = new MaterialGiven({
        orderId,
        materialName,
        givenQuantity,
        materialId: material?._id,
        unit: material.unit || storeMaterial.unit, // `unit` saqlanadi
      });

      await givenMaterial.save();

      return response.success(
        res,
        `Material muvaffaqiyatli berildi: ${givenQuantity} ${
          material.unit || storeMaterial.unit
        }!`,
        givenMaterial
      );
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  };

  static orderProgress = async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order)
        return res.status(404).json({ message: "Buyurtma topilmadi" });

      const givenMaterials = await MaterialGiven.find({ orderId });

      // Umumiy kerak bo'lgan materiallar miqdorini topish
      const totalRequired = order.materials.reduce(
        (sum, material) => sum + material.quantity,
        0
      );

      // Berilgan materiallarning umumiy miqdorini topish
      const totalGiven = givenMaterials.reduce(
        (sum, g) => sum + g.givenQuantity,
        0
      );

      // Umumiy foiz hisoblash
      const percentage =
        totalRequired > 0 ? ((totalGiven / totalRequired) * 100).toFixed(2) : 0;
      response.success(res, "Umumiy materiallar ta'minlanish foizi", {
        percentage,
      });
    } catch (error) {
      return response.serverError(res, "Server xatosi", error);
    }
  };

  // orderId va materialId bo‘yicha barcha mos keluvchi materiallarni olish
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

  // static async calculateDebt(req, res) {
  //   try {
  //     const totalDebt = await Order.aggregate([
  //       {
  //         $group: {
  //           _id: null,
  //           totalDebt: { $sum: { $subtract: ["$budget", "$paid"] } },
  //         },
  //       },
  //     ]);

  //     const debtAmount = totalDebt.length > 0 ? totalDebt[0].totalDebt : 0;
  //     // Pul birligi formati bilan chiqarish
  //     const formattedDebt = new Intl.NumberFormat("uz-UZ", {
  //       style: "currency",
  //       currency: "UZS",
  //       minimumFractionDigits: 0,
  //     }).format(debtAmount);

  //     return response.success(res, "Umumiy qarz:", formattedDebt);
  //   } catch (error) {
  //     return response.serverError(res, "Server xatosi", error);
  //   }
  // }
  static async calculateDebt(req, res) {
    try {
      const totalDebt = await Order.aggregate([
        {
          $match: { isType: true }, // Faqat isType true bo'lgan mijozlarni tanlash
        },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: "$budget" },
            totalPaid: { $sum: "$paid" },
          },
        },
        {
          $project: {
            _id: 0,
            totalDebt: { $subtract: ["$totalBudget", "$totalPaid"] }, // Qarzni hisoblash
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
      // const orders = await Order.find({
      //   isType: true,
      //   $expr: { $gt: ["$totalBudget", "$totalPaid"] },
      // });
      const orders = await Order.find();

      return response.success(res, "Orders retrieved successfully", orders);
    } catch (error) {
      console.log(error);
      return response.serverError(res, "Failed to retrieve orders", error);
    }
  }
}

module.exports = OrderController;
