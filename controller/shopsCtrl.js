// controllers/orderController.js
const Orderlist = require("../model/shopsOrderList");
const response = require("../utils/response");

class orderShops {
  // Yangi buyurtma qo'shish
  async createOrder(req, res) {
    try {
      const order = await Orderlist.create(req.body);
      response.created(res, "Buyurtma yaratildi", order);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Barcha buyurtmalarni olish
  async getAllOrders(req, res) {
    try {
      const orders = await Orderlist.find().populate("shopsId").lean();
      response.success(res, "Barcha buyurtmalar", orders);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // shopsId bo'yicha buyurtmalarni olish
  async getOrdersByShop(req, res) {
    try {
      const orders = await Orderlist.find({ shopsId: req.params.shopsId })
        .populate("shopsId")
        .lean();
      response.success(res, "Do'kon bo'yicha buyurtmalar", orders);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // shopsId bo'yicha barcha isPaid: false bo'lgan buyurtmalarni topib, totalPrice ni yig'ish
  async getUnpaidTotalByShop(req, res) {
    try {
      const total = await Orderlist.aggregate([
        { $match: { shopsId: req.params.shopsId, isPaid: false } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      response.success(res, "To'lanmagan buyurtmalar umumiy narxi", {
        total: total[0]?.total || 0,
      });
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Barcha isPaid: false bo'lgan buyurtmalarni topib, totalPrice ni yig'ish
  async getUnpaidTotal(req, res) {
    try {
      const total = await Orderlist.aggregate([
        { $match: { isPaid: false } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      response.success(res, "Barcha to'lanmagan buyurtmalar umumiy narxi", {
        total: total[0]?.total || 0,
      });
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Buyurtmani yangilash
  async updateOrder(req, res) {
    try {
      const updatedOrder = await Orderlist.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).lean();
      if (!updatedOrder) return response.notFound(res, "Buyurtma topilmadi");
      response.success(res, "Buyurtma yangilandi", updatedOrder);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Buyurtmani o'chirish
  async deleteOrder(req, res) {
    try {
      const deletedOrder = await Orderlist.findByIdAndDelete(
        req.params.id
      ).lean();
      if (!deletedOrder) return response.notFound(res, "Buyurtma topilmadi");
      response.success(res, "Buyurtma o'chirildi");
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Materiallarni qo'shish
  async addMaterial(req, res) {
    try {
      const updatedOrder = await Orderlist.findByIdAndUpdate(
        req.params.orderId,
        { $push: { materials: req.body } },
        { new: true, runValidators: true }
      ).lean();
      if (!updatedOrder) return response.notFound(res, "Buyurtma topilmadi");
      response.success(res, "Material qo'shildi", updatedOrder);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // Materialni o'chirish
  async deleteMaterial(req, res) {
    try {
      const updatedOrder = await Orderlist.findByIdAndUpdate(
        req.params.orderId,
        { $pull: { materials: { _id: req.params.materialId } } },
        { new: true }
      ).lean();
      if (!updatedOrder) return response.notFound(res, "Buyurtma topilmadi");
      response.success(res, "Material o'chirildi", updatedOrder);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }

  // get isPaid: false orders
  async getOrdersByisPaid(req, res) {
    try {
      const orders = await Orderlist.find({
        isPaid: req.query.isPaid === "true" ? true : false,
      });
      if (!orders)
        return response.notFound(res, "To'lanmagan buyurtmalar topilmadi");
      response.success(res, "To'lanmagan buyurtmalar", orders);
    } catch (err) {
      response.serverError(res, err.message);
    }
  }
}

module.exports = new orderShops();
