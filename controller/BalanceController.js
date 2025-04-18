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
      return Response.success(res, "Balans olindi", balance);
    } catch (error) {
      return Response.serverError(res, "Xatolik yuz berdi", error);
    }
  }



  static async updateBalance(req, res) {
    try {
      let io = req.app.get("socket");
      const { amount, type, payType } = req.body;

      // Miqdorni tekshirish
      if (!amount || amount <= 0) {
        return Response.error(res, "Noto‘g‘ri miqdor kiritildi");
      }

      // To‘lov turi bo‘yicha qaysi balansni yangilashni aniqlash
      let balanceField;
      if (payType === "dollar") {
        balanceField = "dollarBalance";
      } else if (payType === "Bank orqali") {
        balanceField = "bankTransferBalance";
      } else if (payType === "Naqd") {
        balanceField = "cashBalance";
      } else {
        return Response.error(res, "Noto‘g‘ri to‘lov turi");
      }

      // Yangilash so‘rovini yaratish
      let updateQuery;
      if (type === "add") {
        updateQuery = { $inc: { [balanceField]: amount } };
      } else if (type === "subtract") {
        // Balans yetarli ekanligini tekshirish
        const balance = await Balance.findOne();
        if (!balance || balance[balanceField] < amount) {
          return Response.error(res, payType + " Balans yetarli emas");
        }
        updateQuery = { $inc: { [balanceField]: -amount } };
      } else {
        return Response.error(res, "Noto‘g‘ri operatsiya turi");
      }

      // findOneAndUpdate yordamida balansni yangilash
      const updatedBalance = await Balance.findOneAndUpdate({}, updateQuery, {
        new: true,
        upsert: true,
      });

      io.emit("balance", updatedBalance);

      return Response.success(res, "Balans muvaffaqiyatli yangilandi", {
        balance: updatedBalance,
      });
    } catch (error) {
      return Response.serverError(res, "Xatolik yuz berdi", error);
    }
  }
}

module.exports = BalanceController;
