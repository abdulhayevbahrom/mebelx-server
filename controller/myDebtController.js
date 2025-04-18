const MyDebt = require("../model/myDebtModel");
const response = require("../utils/response");

class MyDebtController {

  async getMyDebts(req, res) {
    try {
      const myDebts = await MyDebt.find();
      if (!myDebts.length) return response.notFound(res, "MyDebts not found");

      // Calculate remaining amount for each debt
      const debtsWithRemaining = myDebts.map(debt => {
        // Sum of all debt amounts
        const totalDebt = debt.debts.reduce((sum, d) => sum + d.amount, 0);
        // Sum of all payment amounts
        const totalPayments = debt.payments.reduce((sum, p) => sum + p.amount, 0);
        // Calculate remaining amount
        const remainingAmount = totalPayments - totalDebt;

        return {
          ...debt._doc,
          remainingAmount
        };
      });


      return response.success(res, "MyDebts found", debtsWithRemaining);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }
  async postMyDebt(req, res) {
    try {
      const io = req.app.get("socket");
      const { body } = req.body;
      const { amount, description, name, type } = body;

      // Validate required fields
      if (!amount || !name || !type) {
        return response.error(res, "Missing required fields", 400);
      }

      // Validate amount is a positive number
      if (typeof amount !== "number" || amount <= 0) {
        return response.error(res, "Invalid amount", 400);
      }

      // Create debt data object
      const debtData = {
        name,
        debts: [{ amount, date: new Date(), description: description }],
        type,
        payments: [],
        isPaid: false,
      };


      const myDebt = new MyDebt(debtData);
      const savedDebt = await myDebt.save(); // Shunda ishlaydi
      // Emit socket event
      io.emit("updateMyDebt", savedDebt);

      return response.created(res, savedDebt, "Debt created successfully");
    } catch (err) {
      console.error("Error creating debt:", err);
      return response.serverError(res, "Failed to create debt");
    }
  }


  async updateMyDebt(req, res) {
    try {
      let io = req.app.get("socket");
      const myDebt = await MyDebt.findById(req.params.id);
      if (!myDebt) return response.notFound(res, "MyDebt not found");

      // Push new debt amount to the debts array
      myDebt.debts.push({ amount: req.body.amount, date: new Date() });
      myDebt.description = req.body.description || myDebt.description;
      myDebt.type = req.body.type || myDebt.type;

      const updatedMyDebt = await myDebt.save();
      io.emit("updateMyDebt", updatedMyDebt);
      return response.success(res, "MyDebt updated", updatedMyDebt);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  async getIsPaidFalse(req, res) {
    try {
      const myDebts = await MyDebt.find({ isPaid: false });
      if (!myDebts.length) return response.notFound(res, "MyDebts not found");
      return response.success(res, "MyDebts found", myDebts);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  async paymentForDebt(req, res) {
    try {
      let io = req.app.get("socket");
      const myDebt = await MyDebt.findById(req.params.id);
      if (!myDebt) return response.notFound(res, "MyDebt not found");
      myDebt.payments.push(req.body);
      myDebt.checkIfPaid();
      const updatedMyDebt = await myDebt.save();
      io.emit("updateMyDebt", updatedMyDebt);
      return response.success(res, "Payment for debt success", updatedMyDebt);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }
}

module.exports = new MyDebtController();