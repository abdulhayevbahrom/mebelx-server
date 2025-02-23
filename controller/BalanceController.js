const Balance = require("../model/balanceSchema");
const Response = require("../utils/response");

class BalanceController {
  // Balansni olish
  static async getBalance(req, res) {
    try {
      let balance = await Balance.findOne();
      if (!balance) {
        balance = new Balance();
        await balance.save();
      }
      return Response.success(res, "Balans olindi", {
        balance: balance.balance,
      });
    } catch (error) {
      return Response.serverError(res, "Xatolik yuz berdi", error);
    }
  }

  // Pul qo‘shish yoki ayirish
  static async updateBalance(req, res) {
    try {
      let io = req.app.get("socket");
      const { amount, type } = req.body;
      if (!amount || amount <= 0) {
        return Response.error(res, "Noto‘g‘ri miqdor kiritildi");
      }

      let balance = await Balance.findOne();
      if (!balance) {
        balance = new Balance();
      }

      if (type === "add") {
        balance.balance += amount;
      } else if (type === "subtract") {
        if (balance.balance < amount) {
          return Response.error(res, "Balans yetarli emas");
        }
        balance.balance -= amount;
      } else {
        return Response.error(res, "Noto‘g‘ri operatsiya turi");
      }

      await balance.save();
      io.emit("balance", balance.balance);
      return Response.success(res, "Balans yangilandi", {
        balance: balance.balance,
      });
    } catch (error) {
      return Response.serverError(res, "Xatolik yuz berdi", error);
    }
  }
}

module.exports = BalanceController;
