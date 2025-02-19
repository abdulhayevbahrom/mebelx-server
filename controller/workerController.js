const response = require("../utils/response");
const workersDB = require("../model/workersModel");
const FormData = require("form-data");
const axios = require("axios");
const sharp = require("sharp");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class WorkerController {
  async getWorkers(req, res) {
    try {

      req.app.get("socket").emit("all_worker", "salomaat");
      const workers = await workersDB.find();
      if (!workers.length) return response.notFound(res, "ishchilar topilmadi");
      response.success(res, "Barcha ishchilar", workers);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async createWorker(req, res) {
    try {
      let io = req.app.get("socket");

      // io.emit("new_worker", "salomaat");

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
      const worker = await workersDB.findByIdAndDelete(req.params.id);
      if (!worker) return response.error(res, "Ishchi o'chirilmadi");
      response.success(res, "Ishchi o'chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async updateWorker(req, res) {
    try {
      const worker = await workersDB.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );
      if (!worker) return response.error(res, "Ishchi yangilashda xatolik");
      response.success(res, "Ishchi yangilandi", worker);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new WorkerController();
