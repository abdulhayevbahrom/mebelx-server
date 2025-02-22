const AttendanceDB = require("../model/attendanceModel");
const response = require("../utils/response");

class AttendanceController {
  async create(req, res) {
    try {
      const result = await AttendanceDB.create(req.body);

      if (!result) return response.error(res, "Ma'lumot kirishda xatolik");
      return response.success(res, "Saqlandi", result);
    } catch (error) {
      return response.error(res, error.message, error);
    }
  }

  updateAttendance = async (req, res) => {
    try {
      const { workerId, name, date, workingHours, outTime } = req.body;

      const myData = {
        workerId,
        workerName: name,
        date,
        workingHours,
        inTime: outTime
      };

      let attendance = await AttendanceDB.findOne({ workerId, date });

      if (attendance) {
        await AttendanceDB.updateOne(
          { _id: attendance._id }, // Faqat tegishli ma'lumotni yangilash
          { $set: myData }
        );
        return res.status(200).json({ message: "Davomat yangilandi", attendance: { ...attendance._doc, ...myData } });
      } else {
        // Agar mavjud bo‘lmasa, yangi yozuv yaratish
        attendance = new AttendanceDB(myData);
        await attendance.save();
        return res.status(201).json({ message: "Yangi davomat yaratildi", attendance });
      }
    } catch (error) {
      return res.status(500).json({ error: "Server xatosi", details: error.message });
    }
  };


  async getAll(req, res) {
    try {
      const result = await AttendanceDB.find();
      if (!result) return response.notFound(res, "Ma'lumotlar topilmadi");
      return response.success(res, "Barcha davomatlar", result);
    } catch (error) {
      return response.error(res, error.message, error);
    }
  }

  async getByDate(req, res) {
    try {
      const result = await AttendanceDB.find({ date: req.params.date });
      if (!result) return response.notFound(res, "Ma'lumotlar topilmadi");
      return response.success(res, "Barcha davomatlar", result);
    } catch (error) {
      return response.error(res, error.message, error);
    }
  }

  async updateByAttendance(req, res) {
    try {
      const worker = await AttendanceDB.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );

      if (!worker) return response.error(res, "Davomat yangilashda xatolik");
      response.success(res, "Davomat yangilandi", worker);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getMonthlyAttendance(req, res) {
    try {
      const { year, month } = req.params;
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const result = await AttendanceDB.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      });

      if (!result.length) return response.notFound(res, "Ma'lumotlar topilmadi");

      return response.success(res, "Barcha davomatlar", result);
    } catch (error) {
      return response.error(res, error.message, error);
    }
  }
}

module.exports = new AttendanceController();
