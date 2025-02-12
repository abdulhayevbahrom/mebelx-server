const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AdminDB = require("../model/adminModel");
const response = require("../utils/response");

class adminController {
  async getAdmins(req, res) {
    try {
      const admins = await AdminDB.find();
      if (!admins.length) return response.notFound(res, "Adminlar topilmadi");
      response.success(res, "Barcha adminlar", admins);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async createAdmin(req, res) {
    try {
      const salt = crypto.randomBytes(16).toString("hex");
      let hashpassword = crypto
        .createHash("sha256", salt)
        .update(req.body.password)
        .digest("hex");
      req.body.password = `${salt}:${hashpassword}`;


      const admin = await AdminDB.create(req.body);
      if (!admin) return response.error(res, "Admin qo'shilmadi", admin);
      response.created(res, "Admin yaratildi", admin);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async login(req, res) {
    try {
      let { login, password } = req.body;
      let exactAdmin = await AdminDB.findOne({ login });
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

  async deleteAdmin(req, res) {
    try {
      const admin = await AdminDB.findByIdAndDelete(req.params.id);
      if (!admin) return response.error(res, "Admin topilmadi", admin);
      response.success(res, "Admin o'chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async updateAdmin(req, res) {
    try {
      const admin = await AdminDB.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!admin)
        return response.error(res, "Admin yangilashda xatolik", admin);
      response.success(res, "Admin yangilandi", admin);
    } catch (err) {
      response.serverError(res, err.message, "Server xatosi");
    }
  }
}

module.exports = new adminController();
