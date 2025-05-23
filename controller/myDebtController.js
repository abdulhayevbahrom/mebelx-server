const MyDebt = require("../model/myDebtModel");
const response = require("../utils/response");

class MyDebtController {
  // Helper function to calculate remaining balances
  #calculateRemaining(debt) {
    const balanceByType = { Naqd: 0, dollar: 0 };

    // Aggregate debts
    debt.debts.forEach((d) => {
      const type = d.type === "Bank orqali" ? "Naqd" : d.type;
      balanceByType[type] += d.amount;
    });

    // Subtract payments
    debt.payments.forEach((p) => {
      const type = p.type === "Bank orqali" ? "Naqd" : p.type;
      balanceByType[type] -= p.amount;
    });

    // Calculate status for each currency type
    return {
      Naqd: {
        amount: Math.abs(balanceByType.Naqd),
        status: this.#getStatus(balanceByType.Naqd),
      },
      dollar: {
        amount: Math.abs(balanceByType.dollar),
        status: this.#getStatus(balanceByType.dollar),
      },
    };
  }

  // Helper function to determine status
  #getStatus(balance) {
    return balance > 0
      ? "Kompaniya qarzdor"
      : balance < 0
        ? "Kompaniyaga qarzdor"
        : "Qarz yo'q";
  }

  // Get all debts with remaining balances
  async getMyDebts(req, res) {
    try {
      const myDebts = await MyDebt.find().lean();
      if (!myDebts.length) {
        return response.notFound(res, "Qarz yozuvlari topilmadi");
      }

      const debtsWithRemaining = myDebts.map((debt) => ({
        ...debt,
        remainingByType: this.#calculateRemaining(debt),
      }));

      return response.success(res, "Qarz yozuvlari topildi", debtsWithRemaining);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  // Create new debt
  async postMyDebt(req, res) {
    try {
      const { debtsType, amount, description, name, type } = req.body;

      // Validate input
      if (!amount || !name || !type) {
        return response.error(res, "Missing required fields", 400);
      }
      if (typeof amount !== "number" || amount <= 0) {
        return response.error(res, "Invalid amount", 400);
      }

      // Prepare debt data
      const debtData = {
        name,
        type,
        debts: debtsType === "Qarz Berish" ? [] : [{ amount, date: new Date(), description, type }],
        payments: debtsType === "Qarz Berish" ? [{ amount, date: new Date(), description, type }] : [],
        isPaid: debtsType !== "Qarz Berish",
      };

      const myDebt = await new MyDebt(debtData).save();
      req.app.get("socket").emit("updateMyDebt", myDebt);

      return response.created(res, myDebt, "Debt created successfully");
    } catch (err) {
      console.error("Error creating debt:", err);
      return response.serverError(res, "Failed to create debt");
    }
  }

  // Update existing debt
  async updateMyDebt(req, res) {
    try {
      const { id } = req.params;
      const { amount, isPaid, description, type } = req.body;

      const updateData = {
        $push: {
          [isPaid ? "payments" : "debts"]: { amount, type, description, date: new Date() },
        },
      };

      const myDebt = await MyDebt.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!myDebt) {
        return response.notFound(res, "MyDebt not found");
      }

      req.app.get("socket").emit("updateMyDebt", myDebt);
      return response.success(res, "MyDebt updated", myDebt);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  // Get unpaid debts
  async getIsPaidFalse(req, res) {
    try {
      const myDebts = await MyDebt.find({ isPaid: false }).lean();
      return myDebts.length
        ? response.success(res, "MyDebts found", myDebts)
        : response.notFound(res, "MyDebts not found");
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  // Add payment to debt
  async paymentForDebt(req, res) {
    try {
      const myDebt = await MyDebt.findById(req.params.id);
      if (!myDebt) return response.notFound(res, "MyDebt not found");

      myDebt.payments.push(req.body);
      myDebt.checkIfPaid();
      const updatedMyDebt = await myDebt.save();

      req.app.get("socket").emit("updateMyDebt", updatedMyDebt);
      return response.success(res, "Payment for debt success", updatedMyDebt);
    } catch (err) {
      return response.serverError(res, err.message);
    }
  }

  // Generate debt report
  async myDebtReport(req, res) {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return response.error(res, "month va year talab qilinadi", 400);
      }

      const { startDate, endDate } = this.#getMonthRange(Number(year), Number(month));
      const companies = await MyDebt.find().lean();

      const report = companies.map((company) => {
        const monthlyDebts = company.debts.filter(
          (d) => d.date >= startDate && d.date < endDate
        );
        const monthlyPayments = company.payments.filter(
          (p) => p.date >= startDate && p.date < endDate
        );

        const totalDebts = monthlyDebts.reduce((sum, d) => sum + d.amount, 0);
        const totalPayments = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
          company: company.name,
          totalDebts,
          totalPayments,
          balance: totalDebts - totalPayments,
          monthlyDebts,
          monthlyPayments,
        };
      });

      return response.success(res, "Report generated", report);
    } catch (err) {
      console.error("Hisobot xatosi:", err);
      return response.serverError(res, "Server xatosi");
    }
  }

  // Helper function to get month range
  #getMonthRange(year, month) {
    return {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 1),
    };
  }
}

module.exports = new MyDebtController();


