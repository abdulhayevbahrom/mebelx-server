const response = require("../utils/response");
const FormData = require("form-data");
const axios = require("axios");
const sharp = require("sharp");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Expense = require("../model/expense");
const Attendance = require("../model/attendanceModel");
const jwt = require("jsonwebtoken");
const workersDB = require("../model/workersModel");
const Worker = require("../model/workersModel");
const WorkingDays = require("../model/workingDays");

// Ensure indexes for performance
Attendance.createIndexes({ workerId: 1, date: 1 });
Expense.createIndexes({ relevantId: 1, date: 1, category: 1 });
workersDB.createIndexes({ _id: 1 });

const parseHours = (hours) => (hours ? parseFloat(hours) : 0);

class WorkerController {
  async getWorkerMain(req, res) {
    try {
      req.app.get("socket").emit("all_worker", "salomaat");

      const workers = await Worker.find()
      if (!workers.length) {
        return response.notFound(res, "Ishchilar topilmadi");
      }

      response.success(res, "Barcha ishchilar", workers);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
  async getWorkers(req, res) {
    try {
      // Emit socket event
      req.app.get("socket").emit("all_worker", "salomaat");

      // Fetch all workers
      const workers = await Worker.find() // Use lean() for better performance
      if (!workers.length) {
        return response.notFound(res, "Ishchilar topilmadi");
      }
      // Fetch the latest working days record
      let workingDaysRecord = await WorkingDays.findOne()
        .sort({ createdAt: -1 }) // Get the most recent record
        .lean();

      const monthlyWorkingDays = workingDaysRecord ? workingDaysRecord.minthlyWorkingDay : 26; // e.g., 26
      const hoursPerDay = 10; // Each worker works 10 hours per day
      const totalHoursInMonth = monthlyWorkingDays * hoursPerDay; // e.g., 26 * 10 = 260 hours

      // Calculate hourly salary array for each worker
      const workersWithHourlySalary = workers.map((worker) => {
        // Ensure salary is an array
        const salaries = Array.isArray(worker.salary) ? worker.salary : [];
        const sortedSalaries = [...salaries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const hourlySalaryArray = sortedSalaries.map((salaryEntry) => {
          const monthlySalary = Number(salaryEntry.salary) || 0; // Convert to number, default to 0
          const hourlySalary = totalHoursInMonth > 0
            ? Math.round(monthlySalary / totalHoursInMonth) // Calculate hourly rate
            : 0;
          return {
            hourlySalary: String(hourlySalary), // Store as string to match salary
            createdAt: salaryEntry.createdAt // Use same createdAt as salary
          };
        });

        return {
          ...worker,
          hourlySalary: hourlySalaryArray // Add array of hourly salary objects
        };
      });
      response.success(res, "Barcha ishchilar", workersWithHourlySalary);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async createWorker(req, res) {
    try {
      let io = req.app.get("socket");

      const data = JSON.parse(JSON.stringify(req.body));


      if (req.file) {
        const formData = new FormData();
        const processedImage = await sharp(req.file.buffer)
          .resize({ width: 300, height: 400, fit: "cover" }) // 3x4 format
          .jpeg({ quality: 90 }) // Sifatni saqlash
          .toBuffer();

        formData.append("image", processedImage.toString("base64"));

        let api = `${process.env.IMAGE_BB_API_URL}?key=${process.env.IMAGE_BB_API_KEY}`;
        const response = await axios.post(api, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response?.data?.data?.url) {
          data.img = response.data.data.url;
        }
      }

      const salt = crypto.randomBytes(16).toString("hex");
      let hashpassword = crypto
        .createHash("sha256", salt)
        .update(req.body.password)
        .digest("hex");

      data.password = `${salt}:${hashpassword}`;

      const worker = await Worker.create(data);
      if (!worker) return response.error(res, "Ishchi qo'shilmadi");
      io.emit("new_worker", worker);
      response.created(res, "Ishchi yaratildi", worker);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async login(req, res) {
    try {
      let { login, password } = req.body;
      let exactAdmin = await workersDB.findOne({ login });
      if (!exactAdmin) return response.error(res, "Login yoki parol xato");

      const [salt, storedHashedPassword] = exactAdmin.password.split(":");
      const hashedPassword = crypto
        .createHash("sha256", salt)
        .update(password)
        .digest("hex");

      if (hashedPassword !== storedHashedPassword)
        return response.error(res, "Login yoki parol xato");

      let token = await jwt.sign(
        {
          id: exactAdmin._id,
          login: exactAdmin.login,
          role: exactAdmin.role,
        },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "30d",
        }
      );
      response.success(res, "Kirish muvaffaqiyatli", {
        admin: { ...exactAdmin.toJSON() },
        token,
      });
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async deleteWorker(req, res) {
    try {
      let io = req.app.get("socket");
      const worker = await workersDB.findByIdAndDelete(req.params.id);
      if (!worker) return response.error(res, "Ishchi o'chirilmadi");
      response.success(res, "Ishchi o'chirildi");
      io.emit("new_worker", worker);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async updateWorker(req, res) {
    try {
      let io = req.app.get("socket");
      const data = JSON.parse(JSON.stringify(req.body));

      const { login } = data;

      const existingWorker = await workersDB.findOne({
        login: login,
        _id: { $ne: req.params.id },
      });

      if (existingWorker)
        return response.error(res, "Bu login allaqachon mavjud", null);

      const salt = crypto.randomBytes(16).toString("hex");
      let hashpassword = crypto
        .createHash("sha256", salt)
        .update(data.password)
        .digest("hex");
      data.password = `${salt}:${hashpassword}`;

      const worker = await workersDB.findByIdAndUpdate(req.params.id, data, {
        new: true,
      });
      if (!worker) return response.error(res, "Ishchi yangilashda xatolik");
      response.success(res, "Ishchi yangilandi", worker);
      io.emit("new_worker", worker);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Main function to get worker's monthly data
  async getWorkerMonthlyData(req, res) {
    try {
      const { userId, year, month } = req.query; // Expect userId, year, month from frontend
      const currentDate = new Date();

      // Default to last month if no year/month provided
      const targetYear = year ? parseInt(year) : currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
      const start = new Date(targetYear, targetMonth - 1, 1);
      const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

      // Validate inputs
      if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
        return response.badRequest(res, "Invalid userId");
      }

      // Fetch worker(s)
      const workerQuery = userId ? { _id: userId } : {};
      const workers = await workersDB.find(workerQuery).lean();
      if (!workers.length) {
        return response.notFound(res, "Ishchilar topilmadi");
      }

      // Process each worker
      const result = await Promise.all(workers.map(async (worker) => {
        const monthlyData = [];
        let totalRemainingSalary = 0;

        // Get all attendance records for the worker
        const attendanceRecords = await Attendance.find({ workerId: worker._id, createdAt: { $gte: start, $lte: end } })
          .lean()
          .sort({ date: 1 });

        // Group attendance by year and month
        const attendanceByMonth = attendanceRecords.reduce((acc, record) => {
          const date = new Date(record.date);
          const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!acc[yearMonth]) {
            acc[yearMonth] = [];
          }
          acc[yearMonth].push(record);
          return acc;
        }, {});

        // Fetch all relevant expenses (salary payments and advances)
        const expenses = await Expense.find({
          relevantId: worker._id,
          category: { $in: ["Ish haqi", "Avans"] },
          createdAt: { $gte: start, $lte: end }
        }).lean();


        // Calculate hourly salary
        const monthlyWorkingDays = 26; // Default, could be dynamic
        const hoursPerDay = 10;
        const totalHoursInMonth = monthlyWorkingDays * hoursPerDay;
        const hourlySalary = worker.salary && totalHoursInMonth > 0
          ? Math.round(worker.salary / totalHoursInMonth)
          : 0;

        // Process each month
        for (const [yearMonth, records] of Object.entries(attendanceByMonth)) {
          const [y, m] = yearMonth.split("-").map(Number);

          let totalRegularHours = 0;
          let totalOvertimeHours = 0;
          let totalTravelHours = 0;

          // Calculate hours for the month
          records.forEach((record) => {
            const regularHours = parseHours(record.workingHours);
            const overtimeHours = parseHours(record.nightWorkingHours);
            const isTravel = record.status && record.status.loc && record.status.foiz > 0;

            if (isTravel) {
              const travelMultiplier = 1 + (record.status.foiz / 100); // e.g., 20% = 1.2
              totalTravelHours += regularHours * travelMultiplier;
            } else {
              totalRegularHours += regularHours;
            }
            totalOvertimeHours += overtimeHours;
          });

          // Calculate salary
          const regularSalary = totalRegularHours * hourlySalary;
          const travelSalary = totalTravelHours * hourlySalary;
          const overtimeSalary = totalOvertimeHours * (hourlySalary * 2); // Double for overtime
          const totalCalculatedSalary = regularSalary + travelSalary + overtimeSalary;

          // Calculate payments and advances
          const monthExpenses = expenses.filter((exp) => {
            const expDate = new Date(exp.date);
            return expDate.getFullYear() === y && expDate.getMonth() + 1 === m;
          });

          const totalPaid = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
          const remainingSalary = totalCalculatedSalary - totalPaid;

          // Add to total remaining salary
          if (remainingSalary > 0) {
            totalRemainingSalary += remainingSalary;
          }

          // Add to monthly data
          monthlyData.push({
            year: y,
            month: m,
            regularHours: totalRegularHours,
            overtimeHours: totalOvertimeHours,
            travelHours: totalTravelHours,
            totalHours: totalRegularHours + totalOvertimeHours + totalTravelHours,
            calculatedSalary: totalCalculatedSalary,
            paidSalary: totalPaid,
            remainingSalary,
          });
        }

        // Filter for requested month if specified
        const filteredData = monthlyData.filter((data) =>
          (!year || data.year === targetYear) && (!month || data.month === targetMonth)
        );

        return {
          workerId: worker._id,
          workerName: `${worker.firstName} ${worker.lastName}`,
          hourlySalary,
          monthlyData: filteredData.length > 0 ? filteredData : [monthlyData[monthlyData.length - 1]], // Default to last month
          totalRemainingSalary,
        };
      }));

      // Emit socket event
      req.app.get("socket").emit("worker_monthly_data", result);

      // Send response
      response.success(res, "Ishchi oylik ma'lumotlari", result);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getTotalRemainingSalary(req, res) {
    try {
      const { year, month } = req.query;

      // Create date range for the specified month (UTC +05:00)
      const start = new Date(Date.UTC(year, month - 1, 1, 19, 0, 0));
      const end = new Date(Date.UTC(year, month, 0, 18, 59, 59, 999));

      // Fetch necessary data in parallel
      const [workingDaysRecord, expenses, allExpense, allAttendance] = await Promise.all([
        WorkingDays.findOne().sort({ createdAt: -1 }).lean().select('minthlyWorkingDay'),
        Expense.find({
          category: { $in: ["Ish haqi", "Avans"] },
          createdAt: { $gte: start, $lte: end }
        }).lean(),
        Expense.find({
          category: { $in: ["Ish haqi", "Avans"] }
        }).lean(),
        Attendance.find({
          date: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) }
        }).lean()
      ]);

      // Validate working days
      if (!workingDaysRecord?.minthlyWorkingDay) {
        return response.notFound(res, "Ish kunlari topilmadi");
      }

      // Calculate total hours in the month
      const monthlyWorkingDays = workingDaysRecord.minthlyWorkingDay;
      const HOURS_PER_DAY = 10;
      const totalHoursInMonth = monthlyWorkingDays * HOURS_PER_DAY;

      // Fetch workers with hourly salary
      const workers = await workersDB.aggregate([
        {
          $match: {},
        },
        {
          $addFields: {
            hourlySalary: {
              $cond: {
                if: { $isArray: "$salary" },
                then: {
                  $map: {
                    input: { $sortArray: { input: "$salary", sortBy: { createdAt: -1 } } },
                    as: "salaryEntry",
                    in: {
                      hourlySalary: {
                        $toString: {
                          $cond: {
                            if: { $gt: [totalHoursInMonth, 0] },
                            then: { $round: [{ $divide: [{ $toDouble: "$$salaryEntry.salary" }, totalHoursInMonth] }, 0] },
                            else: 0
                          }
                        }
                      },
                      createdAt: "$$salaryEntry.createdAt"
                    }
                  }
                },
                else: []
              }
            }
          }
        }
      ]);

      if (!workers?.length) {
        return response.notFound(res, "Ishchilar topilmadi");
      }

      // Helper function to get latest hourly salary
      const getLatestHourlySalary = (worker, start, end) => {
        const filteredSalaries = worker.hourlySalary.filter(salary => {
          const createdAt = new Date(salary.createdAt);
          return createdAt >= start && createdAt <= end;
        });
        return filteredSalaries[0]?.hourlySalary ? +filteredSalaries[0].hourlySalary : 0;
      };

      // Process workers' data
      const workersData = workers.map(worker => {
        // Filter attendance records for this worker
        const workerRecords = allAttendance.filter(record =>
          record.workerId.toString() === worker._id.toString()
        );

        // Get hourly salary
        const baseHourlySalary = getLatestHourlySalary(worker, start, end);

        // Initialize salary and hours
        let regularHours = 0, nightHours = 0, regularSalary = 0, nightSalary = 0;
        let businessTripHours = { Voxa: 0, Toshkent: 0 };
        let voxaSalary = 0, toshkentSalary = 0;

        // Calculate hours and salaries
        workerRecords.forEach(record => {
          const workingHours = Number(record.workingHours) || 0;
          const nightWorkingHours = Number(record.nightWorkingHours) || 0;
          const isBusinessTrip = record.status?.foiz > 0;
          const location = record.status?.loc || '';

          if (isBusinessTrip && location === 'Voxa') {
            businessTripHours.Voxa += workingHours;
            voxaSalary += workingHours * baseHourlySalary * 1.2;
          } else if (isBusinessTrip && location === 'Toshkent') {
            businessTripHours.Toshkent += workingHours;
            toshkentSalary += workingHours * baseHourlySalary * 1.2;
          } else {
            regularHours += workingHours;
            regularSalary += workingHours * baseHourlySalary;
          }
          nightHours += nightWorkingHours;
          nightSalary += nightWorkingHours * baseHourlySalary * 2;
        });

        const totalHours = regularHours + nightHours + businessTripHours.Voxa + businessTripHours.Toshkent;
        const totalSalary = regularSalary + nightSalary + voxaSalary + toshkentSalary;

        // Process expenses for the current month (handle missing expenses)
        const workerExpenses = expenses.filter(expense =>
          expense.relevantId.toString() === worker._id.toString()
        );
        const avans = workerExpenses
          .filter(expense => expense.category === 'Avans')
          .reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
        const paidSalary = workerExpenses
          .filter(expense => expense.category === 'Ish haqi')
          .reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

        // Calculate historical salary from all attendance
        const totalHistoricalSalary = allAttendance
          .filter(record => record.workerId.toString() === worker._id.toString())
          .reduce((sum, record) => {
            const workingHours = Number(record.workingHours) || 0;
            const nightWorkingHours = Number(record.nightWorkingHours) || 0;
            const isBusinessTrip = record.status?.foiz > 0;
            const location = record.status?.loc || '';
            let recordSalary = 0;
            if (isBusinessTrip && (location === 'Voxa' || location === 'Toshkent')) {
              recordSalary += workingHours * baseHourlySalary * 1.2;
            } else {
              recordSalary += workingHours * baseHourlySalary;
            }
            recordSalary += nightWorkingHours * baseHourlySalary * 2;
            return sum + recordSalary;
          }, 0);

        // Calculate total historical payments from allExpense
        const totalPaid = allExpense
          .filter(expense => expense.relevantId.toString() === worker._id.toString())
          .reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

        const totalRemainingSalary = totalHistoricalSalary - totalPaid;

        return {
          fullName: `${worker.firstName} ${worker.lastName}`,
          workerID: worker._id,
          regular: { hours: regularHours, salary: Math.round(regularSalary) },
          night: { hours: nightHours, salary: Math.round(nightSalary) },
          voxa: { hours: businessTripHours.Voxa, salary: Math.round(voxaSalary) },
          toshkent: { hours: businessTripHours.Toshkent, salary: Math.round(toshkentSalary) },
          totalSalary: Math.round(totalSalary),
          totalHours,
          avans: Math.round(avans),
          paidSalary: Math.round(paidSalary),
          regularHours: baseHourlySalary,
          remainingSalary: Math.round(totalSalary - avans - paidSalary),
          totalRemainingSalary: Math.round(totalRemainingSalary)
        };
      });

      req.app.get("socket").emit("all_worker", "salomaat");
      return response.success(res, "Barcha ishchilar ma'lumotlari", workersData);
    } catch (err) {
      return response.serverError(res, "Server xatosi", err.message);
    }
  }


  async getSalaries(req, res) {
    try {
      const { workerId } = req.params;

      // Validate workerId
      if (!mongoose.isValidObjectId(workerId)) {
        return response.error(res, "Invalid worker ID");
      }

      // Find worker and select only the salary field
      const worker = await workersDB.findById(workerId).select("salary");
      if (!worker) {
        return response.notFound(res, "Worker not found");
      }

      return response.success(res, "Salaries retrieved successfully", worker.salary);
    } catch (error) {
      return response.serverError(res, "Server error while retrieving salaries", error.message);
    }
  }

  // CREATE: Add a new salary entry to a worker's salary array
  async createSalary(req, res) {
    try {
      const { workerId } = req.params;
      const { salary } = req.body;

      // Find worker
      const worker = await workersDB.findById(workerId);
      if (!worker) {
        return response.notFound(res, "Worker not found", 404);
      }

      // Clean invalid salary entries (remove any entry without a valid salary field)
      worker.salary = worker.salary.filter(entry =>
        entry &&
        typeof entry === "object" &&
        "salary" in entry &&
        entry.salary != null &&
        typeof entry.salary === "string" &&
        entry.salary.trim() !== "" &&
        !isNaN(Number(entry.salary))
      );
      // Push new salary entry
      worker.salary.push({ salary: salary });
      const updatedWorker = await worker.save();

      return response.created(res, "Salary added successfully", updatedWorker.salary);
    } catch (error) {
      return response.serverError(res, "Server error while creating salary", error.message, 500);
    }
  }



  // DELETE: Remove a specific salary entry from a worker's salary array
  async deleteSalary(req, res) {
    try {
      const { workerId, salaryId } = req.params;

      // Validate workerId and salaryId
      if (!mongoose.isValidObjectId(workerId) || !mongoose.isValidObjectId(salaryId)) {
        return response.error(res, "Invalid worker ID or salary ID");
      }

      // Find worker and pull the salary entry
      const worker = await workersDB.findById(workerId);
      if (!worker) {
        return response.notFound(res, "Worker not found");
      }

      const salaryExists = worker.salary.some(s => s._id.toString() === salaryId);
      if (!salaryExists) {
        return response.notFound(res, "Salary entry not found");
      }

      worker.salary = worker.salary.filter(s => s._id.toString() !== salaryId);
      const updatedWorker = await worker.save();

      return response.success(res, "Salary deleted successfully", updatedWorker.salary);
    } catch (error) {
      return response.serverError(res, "Server error while deleting salary", error.message);
    }
  }
}

module.exports = new WorkerController();
