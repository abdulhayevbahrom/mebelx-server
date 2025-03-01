const Order = require("../model/todoList");
const Response = require("../utils/response");

class OrderService {
  static async createOrder(req, res) {
    try {
      const order = await Order.create(req.body);
      return Response.created(res, "Order created successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to create order", error);
    }
  }

  static async createMaterial(req, res) {
    try {
      const io = req.app.get("socket");
      const order = await Order.findById(req.params.orderId);
      if (!order) return Response.notFound(res, "Order not found");

      order.materials.push(req.body);
      await order.save();

      io.emit("newMaterial", order);
      return Response.success(res, "Material added successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to add material", error);
    }
  }

  static async getOrders(req, res) {
    try {
      const orders = await Order.find(req.query);
      return Response.success(res, "Orders retrieved successfully", orders);
    } catch (error) {
      return Response.serverError(res, "Failed to retrieve orders", error);
    }
  }

  static async getNewOrders(req, res) {
    try {
      const orders = await Order.findOne({
        isNew: true
      });
      return Response.success(res, "Orders retrieved successfully", orders);
    } catch (error) {
      return Response.serverError(res, "Failed to retrieve orders", error);
    }
  }

  static async getOrderById(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return Response.notFound(res, "Order not found");
      return Response.success(res, "Order retrieved successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to retrieve order", error);
    }
  }
  static async getOrderHistory(req, res) {
    try {
      const order = await Order.find({ isPaid: true });
      console.log(order);
      if (!order) return Response.notFound(res, "Order not found");
      return Response.success(res, "Order retrieved successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to retrieve order", error);
    }
  }

  static async updateOrder(req, res) {
    try {
      let io = req.app.get("socket");
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "No update data provided" });
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: req.body }, // Faqat berilgan maydonlarni yangilash
        { new: true, runValidators: true }
      );

      if (!order) return Response.notFound(res, "Buxgalterga yuborilmadi.");

      io.emit("updateOrder", order);
      return Response.success(res, "Buxgalterga yuborildi", order);
    } catch (error) {
      return Response.serverError(res, error.message);
    }
  }

  static async deleteOrder(req, res) {
    try {
      const io = req.app.get("socket");
      const order = await Order.findByIdAndDelete(req.params.id);
      if (!order) return Response.notFound(res, "Order not found");

      io.emit("deleteOrder", order);
      return Response.success(res, "Order deleted successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to delete order", error);
    }
  }

  static async deleteMaterialById(req, res) {
    try {
      const io = req.app.get("socket");
      const order = await Order.findById(req.params.orderId);
      if (!order) return Response.notFound(res, "Order not found");

      order.materials = order.materials.filter(
        (material) => material.productId !== req.params.materialId
      );
      await order.save();

      io.emit("newMaterial", order);
      return Response.success(res, "Material deleted successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to delete material", error);
    }
  }
  // Controllerda yangilash
  static async updateMaterialById(req, res) {
    try {
      const io = req.app.get("socket");
      const { orderId, materialId } = req.params;
      const updateData = req.body;

      console.log({
        orderId,
        materialId,
        updateData
      });

      // `materials` ichidagi aniq `productId` ni yangilash uchun indeksdan foydalanamiz
      const order = await Order.findOneAndUpdate(
        { _id: orderId, "materials.productId": materialId },
        {
          $set: {
            "materials.$.pricePerUnit": updateData.pricePerUnit,
            "materials.$.quantity": updateData.quantity
          }
        },
        { new: true }
      );

      if (!order) {
        return Response.notFound(res, "Order or Material not found");
      }

      io.emit("materialUpdated", { orderId, materialId, updatedMaterial: updateData });
      return Response.success(res, "Material updated successfully", order);
    } catch (error) {
      console.error(error);
      return Response.serverError(res, "Failed to update material", error);
    }
  }
  static async deleteAllMaterials(req, res) {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) return Response.notFound(res, "Order not found");

      order.materials = [];
      await order.save();
      return Response.success(res, "All materials deleted successfully", order);
    } catch (error) {
      return Response.serverError(res, "Failed to delete all materials", error);
    }
  }
}

module.exports = OrderService;

