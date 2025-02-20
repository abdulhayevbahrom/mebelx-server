const Expense = require("../model/expense");
const response = require("../utils/response"); // Assuming the response class is in the utils folder
const moment = require("moment"); // For date manipulation

class ExpenseController {
  // Yangi expense qo'shish
  async createExpense(req, res) {
    try {
      let io = req.app.get("socket");
      const newExpense = new Expense(req.body);
      await newExpense.save();
      response.created(res, "Expense created successfully", newExpense);
      io.emit("newExpense", newExpense);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  // Barcha expenselarni olish
  async getAllExpenses(req, res) {
    try {
      const expenses = await Expense.find();
      response.success(res, "Expenses fetched successfully", expenses);
    } catch (error) {
      response.serverError(res, error.message);
    }
  }

  // Expense ni ID bo'yicha olish
  async getExpenseById(req, res) {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense) {
        return response.notFound(res, "Expense not found");
      }
      response.success(res, "Expense fetched successfully", expense);
    } catch (error) {
      response.serverError(res, error.message);
    }
  }

  // Expense ni yangilash
  async updateExpense(req, res) {
    try {
      const { name, amount, amountType, description } = req.body;
      const updatedExpense = await Expense.findByIdAndUpdate(
        req.params.id,
        { name, amount, amountType, description },
        { new: true }
      );
      if (!updatedExpense) {
        return response.notFound(res, "Expense not found");
      }
      response.success(res, "Expense updated successfully", updatedExpense);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  // Expense ni o'chirish
  async deleteExpense(req, res) {
    try {
      const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
      if (!deletedExpense) {
        return response.notFound(res, "Expense not found");
      }
      response.success(res, "Expense deleted successfully");
    } catch (error) {
      response.serverError(res, error.message);
    }
  }

  async getExpensesByPeriod(req, res) {
    try {
      const { startDate, endDate } = req.body; // Frontenddan sanalarni olish

      if (!startDate || !endDate) {
        return response.badRequest(res, "Start date and end date are required");
      }

      // Sanalarni moment orqali formatlash
      const startOfPeriod = moment(startDate, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
      const endOfPeriod = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();

      if (startOfPeriod > endOfPeriod) {
        return response.badRequest(res, "Start date must be before end date");
      }

      /* Aggregation pipeline:
               1. $match: tanlangan davrdagi hujjatlarni olamiz.
               2. $facet: uchta parallel pipeline:
                   - outgoing: "Chiqim" turlarini ajratib, umumiy summa va ro'yxatini hisoblash.
                   - income: "Kirim" turlarini ajratib, umumiy summa va ro'yxatini hisoblash.
                   - all: barcha hujjatlarni sanaga ko‘ra tartiblash.
            */
      const pipeline = [
        {
          $match: {
            date: { $gte: startOfPeriod, $lte: endOfPeriod },
          },
        },
        {
          $facet: {
            outgoing: [
              { $match: { type: "Chiqim" } },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: "$amount" },
                  expenses: { $push: "$$ROOT" },
                },
              },
            ],
            income: [
              { $match: { type: "Kirim" } },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: "$amount" },
                  expenses: { $push: "$$ROOT" },
                },
              },
            ],
            all: [{ $sort: { date: 1 } }],
          },
        },
      ];

      const results = await Expense.aggregate(pipeline);

      // Agar tanlangan davrda hujjat topilmasa
      if (!results || !results[0] || !results[0].all.length) {
        return response.notFound(res, "No expenses found for the given period");
      }

      // Moment locale-ni o'zbek tilida sozlaymiz
      moment.locale("uz");
      // Avval "D-MMMM" formatida sanalarni olamiz
      const formattedStartRaw = moment(startOfPeriod).format("D-MMMM");
      const formattedEndRaw = moment(endOfPeriod).format("D-MMMM");

      // Uzbek oy nomlarini Cyrillicdan Latin yozuviga xaritalash
      const uzMonthMapping = {
        январ: "Yanvar",
        феврал: "Fevral",
        март: "Mart",
        апрел: "Aprel",
        май: "May",
        июн: "Iyun",
        июл: "Iyul",
        август: "Avgust",
        сентябр: "Sentabr",
        октябр: "Oktabr",
        ноябр: "Noyabr",
        декабр: "Dekabr",
      };

      // Xaritalash funksiyasi: sanani "D-MMMM" formatidan Latin yozuviga o‘zgartiradi
      function convertToLatin(formattedDate) {
        const [day, month] = formattedDate.split("-");
        const trimmedMonth = month.trim().toLowerCase();
        const latinMonth = uzMonthMapping[trimmedMonth] || month;
        return `${day}-${latinMonth}`;
      }

      const formattedStart = convertToLatin(formattedStartRaw);
      const formattedEnd = convertToLatin(formattedEndRaw);

      // Facet natijalaridan ma'lumotlarni ajratib olamiz:
      const outgoingData = results[0].outgoing[0] || {
        totalAmount: 0,
        expenses: [],
      };
      const incomeData = results[0].income[0] || {
        totalAmount: 0,
        expenses: [],
      };

      // Javob obyektini optimal nomlar bilan shakllantiramiz:
      const responseData = {
        period: `${formattedStart} - ${formattedEnd}`, // Misol: "1-Fevral - 4-Fevral"
        allExpenses: results[0].all, // Davr bo‘yicha barcha xarajatlar
        outgoingExpenses: outgoingData.expenses, // Faqat "Chiqim" xarajatlar
        totalOutgoing: outgoingData.totalAmount, // "Chiqim" xarajatlarining umumiy miqdori
        incomeExpenses: incomeData.expenses, // Faqat "Kirim" xarajatlar
        totalIncome: incomeData.totalAmount, // "Kirim" xarajatlarining umumiy miqdori
      };

      return response.success(
        res,
        "Expenses fetched successfully",
        responseData
      );
    } catch (error) {
      return response.serverError(res, error.message);
    }
  }

  getBalanceReport = async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return response.badRequest(res, "Start date and end date are required");
      }

      const startOfPeriod = moment(startDate, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
      const endOfPeriod = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();

      if (startOfPeriod > endOfPeriod) {
        return response.badRequest(res, "Start date must be before end date");
      }

      const uzMonthMapping = {
        "01": "Yanvar",
        "02": "Fevral",
        "03": "Mart",
        "04": "Aprel",
        "05": "May",
        "06": "Iyun",
        "07": "Iyul",
        "08": "Avgust",
        "09": "Sentabr",
        10: "Oktabr",
        11: "Noyabr",
        12: "Dekabr",
      };

      const formatUzbekDate = (date) => {
        const momentDate = moment(date, "YYYY-MM-DD");
        return `${momentDate.format("D")}-${
          uzMonthMapping[momentDate.format("MM")]
        }`;
      };

      const formattedPeriod = `${formatUzbekDate(
        startOfPeriod
      )} - ${formatUzbekDate(endOfPeriod)}`;

      // **MongoDB'dan daromad, chiqim va kunlik hisobotlarni olish**
      const [incomeResult, outgoingResult, dailyReport] = await Promise.all([
        Expense.aggregate([
          {
            $match: {
              date: { $gte: startOfPeriod, $lte: endOfPeriod },
              type: "Kirim",
            },
          },
          { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          {
            $match: {
              date: { $gte: startOfPeriod, $lte: endOfPeriod },
              type: "Chiqim",
            },
          },
          { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: startOfPeriod, $lte: endOfPeriod } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              income: {
                $sum: { $cond: [{ $eq: ["$type", "Kirim"] }, "$amount", 0] },
              },
              outgoing: {
                $sum: { $cond: [{ $eq: ["$type", "Chiqim"] }, "$amount", 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      const incomeAmount = incomeResult.length
        ? incomeResult[0].totalAmount
        : 0;
      const outgoingAmount = outgoingResult.length
        ? outgoingResult[0].totalAmount
        : 0;
      const balance = incomeAmount - outgoingAmount;

      return response.success(res, "Balance report generated successfully", {
        formattedPeriod,
        incomeAmount,
        outgoingAmount,
        balance,
        chartData: dailyReport.map(({ _id, income, outgoing }) => ({
          date: formatUzbekDate(_id),
          income,
          outgoing,
        })),
      });
    } catch (error) {
      console.error(error);
      return response.serverError(res, "Xatolik yuz berdi", error.message);
    }
  };
}

module.exports = new ExpenseController();
