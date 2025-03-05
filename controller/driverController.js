const Driver = require("../model/driversModel");
const response = require("../utils/response");

class DriverController {
  async getDrivers(req, res) {
    try {
      const drivers = await Driver.find();
      if (!drivers.length) return response.notFound(res);
      response.success(res, "Haydovchilar ro'yxati", drivers);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  async createDriver(req, res) {
    try {
      let { driver, fare } = req.body;
      if (!driver || !fare)
        return response.badRequest(res, "Haydovchi va yo'lkira kiting");

      let findDriver = await Driver.findById(driver.id);
      if (findDriver) {
        const result = await Driver.findByIdAndUpdate(
          driver.id,
          { $inc: { balance: fare } },
          { new: true }
        );
        if (!result) {
          return response.notFound(res, "Haydovchi topilmadi");
        }
        return response.success(
          res,
          "Balans muvaffaqiyatli o'zgartirildi",
          result
        );
      }

      const new_driver = await Driver.create({
        name: driver.name,
        balance: fare,
      });
      if (!new_driver)
        return response.error(res, "Haydovchi yaratishda xatolik");
      response.success(res, "Haydovchi yaratildi", new_driver);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  async incementBalance(req, res) {
    try {
      const driver = await Driver.findByIdAndUpdate(
        req.params.id,
        { $inc: { balance: req.body.amount } },
        { new: true }
      );
      if (!driver) return response.notFound(res, "Driver not found");

      response.success(res, "Balans muvaffaqiyatli o'zgartirildi", driver);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  async decrementBalance(req, res) {
    try {
      const driver = await Driver.findByIdAndUpdate(
        req.params.id,
        { $inc: { balance: -req.body.amount } },
        { new: true }
      );
      if (!driver) {
        return response.notFound(res, "Driver not found");
      }
      response.success(res, "Balans muvaffaqiyatli o'zgartirildi", driver);
    } catch (error) {
      response.error(res, error.message);
    }
  }

  async deleteDriver(req, res) {
    try {
      const driver = await Driver.findByIdAndDelete(req.params.id);
      if (!driver) {
        return response.notFound(res, "Haydovchi topilmadi");
      }
      response.success(res, "Haydovchi o'chirildi", driver);
    } catch (error) {
      response.error(res, error.message);
    }
  }
}

module.exports = new DriverController();
