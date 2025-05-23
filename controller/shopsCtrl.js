// controllers/orderController.js
const Orderlist = require("../model/shopsOrderList");
const response = require("../utils/response");
const mongoose = require('mongoose');
const moment = require('moment');
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
  async createOrderSoldo(req, res) {
    try {
      const { shopName, totalPrice } = req.body;

      const cleanedData = {
        shopName: shopName || "",
        totalPrice: Number(totalPrice) || 0,
      };

      const order = await Orderlist.create(cleanedData);
      response.created(res, "Buyurtma muvaffaqiyatli yaratildi", order);
    } catch (err) {
      console.error("Xato tafsilotlari:", err);
      response.serverError(res, err.message || "Serverda xatolik yuz berdi");
    }
  }
  // Express route handler to aggregate orders by shopName// Express route handler to aggregate orders by shopName
  async getAggregatedOrders(req, res) {
    try {
      const orders = await Orderlist.find(); // Barcha buyurtmalarni olish

      const aggregatedMap = {};

      orders.forEach(order => {
        const { shopName, totalPrice = 0, paid = 0 } = order;

        if (!aggregatedMap[shopName]) {
          aggregatedMap[shopName] = {
            shopName,
            totalPrice: 0,
            paid: 0,
            orders: []
          };
        }

        aggregatedMap[shopName].totalPrice += totalPrice; // totalPrice ni qo'shish
        aggregatedMap[shopName].paid += paid; // paid ni ham qo'shish
        aggregatedMap[shopName].orders.push(order); // orders larni ham saqlab ketish
      });

      // Endi har bir shop uchun remaining ni hisoblaymiz
      const aggregatedOrders = Object.values(aggregatedMap).map(shop => ({
        shopName: shop.shopName,
        totalPrice: Math.max(shop.totalPrice - shop.paid, 0),
        paid: shop.paid,
        remaining: shop.totalPrice, // agar paid katta bo'lsa 0 qilib yuboramiz
        orders: shop.orders
      }));

      response.success(res, "Buyurtmalar muvaffaqiyatli agregatsiya qilindi", aggregatedOrders);
    } catch (error) {
      console.error('Error aggregating orders:', error);
      response.serverError(res, error.message);
    }
  }

  // Route to process payment for a shopName
  async processPayment(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { shopName, paymentAmount } = req.body;

      if (!shopName || !paymentAmount) {
        return response.error(res, "ShopName yoki paymentAmount yo'q", 400);
      }

      let amountLeft = Number(String(paymentAmount).replace(/\s/g, '')); // Probellarni olib tashlab number qilamiz

      const orders = await Orderlist.find({ shopName, isPaid: false })
        .sort({ createdAt: 1 })
        .session(session);

      if (!orders.length) {
        await session.abortTransaction();
        session.endSession();
        return response.error(res, "To'lanmagan buyurtmalar topilmadi", 404);
      }

      for (const order of orders) {
        const unpaidAmount = Number(order.totalPrice) - Number(order.paid);

        if (amountLeft >= unpaidAmount) {
          // To'liq to'lanadi
          order.paid = Number(order.totalPrice);
          order.isPaid = true;
          amountLeft -= unpaidAmount;
        } else {
          // Qisman to'lanadi
          order.paid = Number(order.paid) + amountLeft;
          amountLeft = 0;
        }

        await order.save({ session });

        if (amountLeft === 0) break; // Pul tugasa chiqamiz
      }

      // Agar pul ortib qolsa, birinchi orderning returnedMoney ga yozamiz
      if (amountLeft > 0 && orders.length > 0) {
        const firstOrder = orders[0];
        firstOrder.returnedMoney = Number(firstOrder.returnedMoney || 0) + amountLeft;
        await firstOrder.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return response.success(res, "To'lovlar muvaffaqiyatli amalga oshirildi");
    } catch (error) {
      console.error("Error processing payment:", error);
      await session.abortTransaction();
      session.endSession();
      return response.serverError(res, error.message);
    }
  }


  async processReturnedPay(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { shopIds, paymentAmount } = req.body;

      const isIds = JSON.parse(shopIds); // to'g'rilandi
      let amountLeft = Number(String(paymentAmount).replace(/\s/g, ''));

      // ID lar bo'yicha orderlarni topamiz
      const orders = await Orderlist.find({ _id: { $in: isIds } }).session(session);

      if (orders.length === 0) {
        throw new Error("Hech qanday buyurtma topilmadi.");
      }

      // Barcha orders bir xil shopName ga tegishli ekanini tekshiramiz
      const firstShopName = orders[0].shopName;
      const allSameShop = orders.every(order => order.shopName === firstShopName);

      if (!allSameShop) {
        throw new Error("Tanlangan buyurtmalar bir xil do'konga tegishli emas.");
      }

      // returnedMoney bo'yicha to'lovni taqsimlaymiz
      for (const order of orders) {
        const remainingToPay = order.returnedMoney - order.returnedPaid;

        if (remainingToPay <= 0) {
          continue; // Bu orderga to'lov kerak emas
        }

        const payAmount = Math.min(remainingToPay, amountLeft);

        order.returnedPaid += payAmount;

        if (order.returnedPaid >= order.returnedMoney) {
          order.returnedState = true;
        }

        amountLeft -= payAmount;

        await order.save({ session });

        if (amountLeft <= 0) {
          break;
        }
      }

      await session.commitTransaction();
      session.endSession();

      return response.success(res, "To'lovlar muvaffaqiyatli amalga oshirildi");
    } catch (error) {
      console.error("Error processing payment:", error);
      await session.abortTransaction();
      session.endSession();
      return response.serverError(res, error.message);
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

  // Barcha qaytarilishi kerak bo'lgan buyurtmalarni olish
  async getReturnedOrders(req, res) {
    try {
      const orders = await Orderlist.find({
        returnedMoney: { $gt: 0 },
        returnedState: false,
      })
        .populate("shopsId")
        .lean();

      // ShopName bo'yicha guruhlab olish
      const groupedOrders = {};

      orders.forEach(order => {
        const shopName = order.shopName || "Noma'lum do'kon"; // Agar shopName bo'sh bo'lsa

        if (!groupedOrders[shopName]) {
          groupedOrders[shopName] = {
            shopName,
            totalReturnedMoney: 0,
            orders: [],
          };
        }

        const unpaidAmount = (order.returnedMoney || 0) - (order.returnedPaid || 0);

        groupedOrders[shopName].totalReturnedMoney += unpaidAmount;
        groupedOrders[shopName].orders.push(order);
      });

      // Natijani array shakliga o'tkazish
      const result = Object.values(groupedOrders);

      response.success(res, "Guruhlangan qaytarilishi kerak bo'lgan buyurtmalar", result);
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

  async generateMonthlyReport(req, res) {
    try {
      const { month, year } = req.query;

      // Validate input
      if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
      }

      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: 'Invalid month' });
      }

      // Define date range for the month
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      // Aggregate orders for the specified month
      const orders = await Orderlist.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: "$shopName", // Group by shopName (or shopsId if needed)
            totalOrders: { $sum: 1 },
            totalPrice: { $sum: "$totalPrice" },
            totalPaid: { $sum: "$paid" },
            totalReturnedMoney: { $sum: "$returnedMoney" },
            totalReturnedPaid: { $sum: "$returnedPaid" },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Calculate overall statistics
      const totalShops = orders.length;
      const totalGoodsValue = orders.reduce((sum, shop) => sum + shop.totalPrice, 0);
      const totalPaidAmount = orders.reduce((sum, shop) => sum + shop.totalPaid, 0);
      const totalDebt = totalGoodsValue - totalPaidAmount;
      const totalShouldReturn = orders.reduce((sum, shop) => sum + shop.totalReturnedMoney, 0);
      const totalActuallyReturned = orders.reduce((sum, shop) => sum + shop.totalReturnedPaid, 0);
      const remainingReturn = totalShouldReturn - totalActuallyReturned;

      // Previous month's debt calculation
      const prevMonthStart = new Date(yearNum, monthNum - 2, 1);
      const prevMonthEnd = new Date(yearNum, monthNum - 1, 0, 23, 59, 59, 999);

      const prevMonthOrders = await Orderlist.aggregate([
        {
          $match: {
            createdAt: {
              $gte: prevMonthStart,
              $lte: prevMonthEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPrice: { $sum: "$totalPrice" },
            totalPaid: { $sum: "$paid" }
          }
        }
      ]);

      const prevMonthDebt = prevMonthOrders.length > 0
        ? prevMonthOrders[0].totalPrice - prevMonthOrders[0].totalPaid
        : 0;

      // Format the report
      const report = {
        period: `${yearNum}-${monthNum.toString().padStart(2, '0')}`,
        totalShopsOrdered: totalShops,
        shopDetails: orders.map(shop => ({
          shopName: shop._id,
          orderCount: shop.totalOrders,
          totalPrice: shop.totalPrice,
          paidAmount: shop.totalPaid,
          debt: shop.totalPrice - shop.totalPaid,
          shouldReturn: shop.totalReturnedMoney,
          actuallyReturned: shop.totalReturnedPaid
        })),
        summary: {
          totalGoodsValue: totalGoodsValue,
          totalPaid: totalPaidAmount,
          currentMonthDebt: totalDebt,
          previousMonthDebt: prevMonthDebt,
          totalShouldReturn: totalShouldReturn,
          totalActuallyReturned: totalActuallyReturned,
          remainingReturn: remainingReturn
        }
      };

      response.success(res, "Barcha hisobotlar", report);
    } catch (error) {
      console.error('Error generating monthly report:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }


}

module.exports = new orderShops();


