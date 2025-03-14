const MyDebt = require("../model/myDebtModel");
const response = require("../utils/response");

class MyDebtController {
  async getMyDebts(req, res) {
    try {
      const myDebts = await MyDebt.find();
      if (!myDebts.length) return response.notFound(res, "MyDebts not found");
      return response.success(res, "MyDebts found", myDebts);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  async postMyDebt(req, res) {
    try {
      let io = req.app.get("socket");
      const myDebt = await MyDebt.create(req.body);
      if (!myDebt) return response.error(res, "MyDebt not created");
      io.emit("updateMyDebt", myDebt);
      return response.created(res, myDebt, "MyDebt created");
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  async getIsPaidFalse(req, res) {
    try {
      const myDebts = await MyDebt.find({ isPaid: false });
      if (!myDebts.length) return response.notFound(res, "MyDebts not found");
      return response.success(res, "MyDebts found", myDebts);
    } catch (err) {
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message });
    }
  }
}
module.exports = new MyDebtController();
