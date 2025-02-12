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
  static async getOrderById(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return response.notFound(res, "Buyurtma topilmadi");
      return response.success(res, "Buyurtma muvaffaqiyatli olindi", order);
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }

  // Yangi buyurtma qo'shish
  static async createOrder(req, res) {
    try {
      const data = JSON.parse(JSON.stringify(req.body));
      data.materials = JSON.parse(data.materials);

      if (req.file) {
        const formData = new FormData();
        const processedImage = await sharp(req.file.buffer)
          .resize({ width: 500, height: 500, fit: "cover" }) // 3x4 format
          .jpeg({ quality: 90 }) // Sifatni saqlash
          .toBuffer();

        formData.append("image", processedImage.toString("base64"));

        let api = `${process.env.IMAGE_BB_API_URL}?key=${process.env.IMAGE_BB_API_KEY}`;
        const response = await axios.post(api, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response?.data?.data?.url) {
          data.image = response.data.data.url;
        }
      }

      data.budget = +data.budget;
      data.paid = +data.paid;
      data.estimatedDays = +data.estimatedDays;
      data.dimensions = {
        length: +data.dimensions.length,
        width: +data.dimensions.width,
        height: +data.dimensions.height,
      };
      data.customer.inn = +data.customer.inn || 0;


      const newOrder = await Order.create(data);
      if (!newOrder) return response.error(res, "Buyurtma yaratishda xatolik");
      response.created(res, "Buyurtma muvaffaqiyatli yaratildi", newOrder);

    } catch (error) {
      return response.error(res, "Buyurtma yaratishda xatolik", error);
    }
  }

  // Buyurtmani yangilash
  static async updateOrder(req, res) {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!updatedOrder) return response.notFound(res, "Buyurtma topilmadi");
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
      const deletedOrder = await Order.findByIdAndDelete(req.params.id);
      if (!deletedOrder) return response.notFound(res, "Buyurtma topilmadi");
      return response.success(res, "Buyurtma muvaffaqiyatli o'chirildi");
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  }



  // Omborchi material berdi
  static giveMaterial = async (req, res) => {
    try {
      const { orderId, materialName, givenQuantity } = req.body;

      // Buyurtmani topish
      const order = await Order.findById(orderId);
      if (!order) return response.notFound(res, "Buyurtma topilmadi");

      // Omborda borligini tekshirish
      const storeMaterial = await StoreModel.findOne({ name: materialName });
      if (!storeMaterial) return response.notFound(res, "Material omborda mavjud emas");

      // Ombordagi yetarlilikni tekshirish
      if (storeMaterial.quantity < givenQuantity) {
        return response.error(
          res,
          `Omborda yetarli material yo‘q! Hozirda faqat ${storeMaterial.quantity} ${storeMaterial.unit} mavjud.`,
          { availableQuantity: storeMaterial.quantity, unit: storeMaterial.unit }
        );
      }

      // Buyurtmadagi materialni topish
      const material = order.materials.find((m) => m.name === materialName);
      if (!material) return response.notFound(res, "Buyurtma ichida bunday material mavjud emas");

      // Ombordan material chiqarish
      storeMaterial.quantity -= givenQuantity;
      await storeMaterial.save();

      // Omborchi bergan materialni saqlash
      const givenMaterial = new MaterialGiven({
        orderId,
        materialName,
        givenQuantity,
        materialId: material?._id,
        unit: material.unit || storeMaterial.unit // `unit` saqlanadi
      });

      await givenMaterial.save();

      return response.success(
        res,
        `Material muvaffaqiyatli berildi: ${givenQuantity} ${material.unit || storeMaterial.unit}!`,
        givenMaterial
      );
    } catch (error) {
      return response.serverError(res, "Serverda xatolik yuz berdi", error);
    }
  };


  // Buyurtma uchun qancha material sarflanganligini hisoblash
  // static orderProgress = async (req, res) => {
  //   try {
  //     const { orderId } = req.params;

  //     const order = await Order.findById(orderId);
  //     if (!order) return res.status(404).json({ message: "Buyurtma topilmadi" });

  //     const givenMaterials = await MaterialGiven.find({ orderId });
  //     console.log(givenMaterials);

  //     let progress = order.materials.map((material) => {
  //       const totalGiven = givenMaterials
  //         .filter((g) => g.materialName === material.name)
  //         .reduce((sum, g) => sum + g.givenQuantity, 0);

  //       const remaining = Math.max(material.quantity - totalGiven, 0);
  //       const percentage = ((totalGiven / material.quantity) * 100).toFixed(2);

  //       return {
  //         materialName: material.name,
  //         required: material.quantity,
  //         given: totalGiven,
  //         remaining,
  //         percentage,
  //       };
  //     });

  //     response.success(res, "Materiallar topildi", progress);
  //   } catch (error) {
  //     return response.serverError(res, "Server xatosi", error);
  //   }
  // };
  static orderProgress = async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ message: "Buyurtma topilmadi" });

      const givenMaterials = await MaterialGiven.find({ orderId });

      // Umumiy kerak bo'lgan materiallar miqdorini topish
      const totalRequired = order.materials.reduce((sum, material) => sum + material.quantity, 0);

      // Berilgan materiallarning umumiy miqdorini topish
      const totalGiven = givenMaterials.reduce((sum, g) => sum + g.givenQuantity, 0);

      // Umumiy foiz hisoblash
      const percentage = totalRequired > 0 ? ((totalGiven / totalRequired) * 100).toFixed(2) : 0;
      console.log(percentage);
      response.success(res, "Umumiy materiallar ta'minlanish foizi", { percentage });
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
      const totalQuantity = givenMaterials.reduce((sum, item) => sum + item.givenQuantity, 0);

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
      if (!materials.length) return response.notFound(res, "Materiallar topilmadi");
      return response.success(res, "Materiallar topildi", materials);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error);
    }
  }
}

module.exports = OrderController;


