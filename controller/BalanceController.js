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

  // Pul qo‘shish yoki ayirish
  // Add or Subtract Balance
  static async updateBalance(req, res) {
    try {
      let io = req.app.get("socket");
      const { amount, type, payType } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return Response.error(res, "Invalid amount entered");
      }

      // Determine which balance field to update based on payType
      let balanceField;
      if (payType === "dollar") {
        balanceField = "dollarBalance";
      } else if (payType === "Bank orqali") {
        balanceField = "bankTransferBalance";
      } else if (payType === "Naqd") {
        balanceField = "cashBalance";
      } else {
        return Response.error(res, "Invalid payment type");
      }

      // Construct update query
      let updateQuery;
      if (type === "add") {
        updateQuery = { $inc: { [balanceField]: amount } };
      } else if (type === "subtract") {
        // Check if there is enough balance before subtracting
        const balance = await Balance.findOne();
        if (!balance || balance[balanceField] < amount) {
          return Response.error(res, "Insufficient balance");
        }
        updateQuery = { $inc: { [balanceField]: -amount } };
      } else {
        return Response.error(res, "Invalid operation type");
      }

      // Update balance using findOneAndUpdate
      const updatedBalance = await Balance.findOneAndUpdate({}, updateQuery, {
        new: true,
        upsert: true,
      });

      io.emit("balance", updatedBalance);

      return Response.success(res, "Balance updated successfully", {
        balance: updatedBalance,
      });
    } catch (error) {
      return Response.serverError(res, "An error occurred", error);
    }
  }
}

module.exports = BalanceController;
