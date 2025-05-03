const MyDebt = require("../model/myDebtModel");
const response = require("../utils/response");

class MyDebtController {
  async getMyDebts(req, res) {
    try {
      const myDebts = await MyDebt.find();
      if (!myDebts.length) {
        return response.notFound(res, "Qarz yozuvlari topilmadi");
      }

      // Har bir yozuv uchun qoldiq summalarni hisoblash
      const debtsWithRemaining = myDebts.map((debt) => {
        // Valyuta bo'yicha balansni hisoblash
        const balanceByType = {
          Naqd: 0, // "Naqd" va "Bank orqali" birgalikda hisoblanadi
          dollar: 0,
        };

        // Qarzlarni yig'ish (kompaniya qarzdor)
        debt.debts.forEach((d) => {
          const type = d.type === "Bank orqali" ? "Naqd" : d.type; // "Bank orqali" ni "Naqd" ga aylantirish
          balanceByType[type] += d.amount;
        });

        // To'lovlarni ayirish (kompaniya to'lagan yoki qabul qilgan)
        debt.payments.forEach((p) => {
          const type = p.type === "Bank orqali" ? "Naqd" : p.type; // "Bank orqali" ni "Naqd" ga aylantirish
          balanceByType[type] -= p.amount;
        });

        // Valyuta bo'yicha qoldiq holatni aniqlash
        const remainingByType = {
          Naqd: {
            amount: Math.abs(balanceByType["Naqd"]),
            status:
              balanceByType["Naqd"] > 0
                ? "Kompaniya qarzdor"
                : balanceByType["Naqd"] < 0
                  ? "Kompaniyaga qarzdor"
                  : "Qarz yo'q",
          },
          dollar: {
            amount: Math.abs(balanceByType["dollar"]),
            status:
              balanceByType["dollar"] > 0
                ? "Kompaniya qarzdor"
                : balanceByType["dollar"] < 0
                  ? "Kompaniyaga qarzdor"
                  : "Qarz yo'q",
          },
        };

        return {
          ...debt._doc,
          remainingByType,
        };
      });

      return response.success(res, "Qarz yozuvlari topildi", debtsWithRemaining);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }
  async postMyDebt(req, res) {
    try {
      const io = req.app.get("socket");
      const { body } = req.body;
      const { debtsType, amount, description, name, type } = body;
      console.log(body);

      // Validate required fields
      if (!amount || !name || !type) {
        return response.error(res, "Missing required fields", 400);
      }

      // Validate amount is a positive number
      if (typeof amount !== "number" || amount <= 0) {
        return response.error(res, "Invalid amount", 400);
      }

      // Create debt data object
      let debtData;
      if (debtsType === "Qarz Berish") {
        debtData = {
          name,
          debts: [], // Add type here
          type,
          payments: [{ amount, date: new Date(), description, type }],
          isPaid: false,
        };
      } else {
        debtData = {
          name,
          debts: [{ amount, date: new Date(), description, type }],
          type,
          payments: [], // Add type here
          isPaid: true,
        };
      }

      const myDebt = new MyDebt(debtData);
      const savedDebt = await myDebt.save();

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
      const { id } = req.params;
      const { amount, isPaid, description, type } = req.body;

      // Find and update debt in a single query
      const myDebt = await MyDebt.findByIdAndUpdate(
        id,
        {
          $push: {
            [isPaid ? 'payments' : 'debts']: { amount, type, description, date: new Date() }
          }
        },
        { new: true, runValidators: true }
      );

      if (!myDebt) {
        return response.notFound(res, 'MyDebt not found');
      }

      req.app.get('socket').emit('updateMyDebt', myDebt);
      return response.success(res, 'MyDebt updated', myDebt);
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