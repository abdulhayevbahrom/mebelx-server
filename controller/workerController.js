const response = require("../utils/response");
const FormData = require("form-data");
const axios = require("axios");
const sharp = require("sharp");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const workersDB = require("../model/workersModel");
const WorkingDays = require("../model/workingDays");

class WorkerController {
  async getWorkers(req, res) {
    try {
      // Emit socket event
      req.app.get("socket").emit("all_worker", "salomaat");

      // Fetch all workers
      const workers = await workersDB.find().lean(); // Use lean() for better performance
      if (!workers.length) {
        return response.notFound(res, "Ishchilar topilmadi");
      }

      // Fetch the latest working days record
      const workingDaysRecord = await WorkingDays.findOne()
        .sort({ createdAt: -1 }) // Get the most recent record
        .lean();

      if (!workingDaysRecord) {
        await WorkingDays.create({ minthlyWorkingDay: 26 });
        // return response.notFound(res, "Ish kunlari ma'lumoti topilmadi");
      }

      const monthlyWorkingDays = workingDaysRecord.minthlyWorkingDay; // e.g., 24, 26, 28
      const hoursPerDay = 10; // Each worker works 10 hours per day

      // Calculate hourly salary for each worker
      const workersWithHourlySalary = workers.map((worker) => {
        const monthlySalary = worker.salary || 0; // Monthly salary, e.g., 5,000,000
        const totalHoursInMonth = monthlyWorkingDays * hoursPerDay; // e.g., 24 * 10 = 240 hours
        const hourlySalary =
          totalHoursInMonth > 0
            ? Math.round(monthlySalary / totalHoursInMonth) // Calculate hourly salary
            : 0;

        return {
          ...worker,
          hourlySalary, // Add hourly salary to worker object
        };
      });

      // Send response to frontend
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

      const worker = await workersDB.create(data);
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
}

module.exports = new WorkerController();
