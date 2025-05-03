const Driver = require("../model/driversModel");
const Expense = require("../model/expense");
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
      let { driver, fare, state, description } = req.body;

      // Validate required fields
      if (!driver?.name || !fare)
        return response.badRequest(res, "To‘liq ma'lumot kiriting");

      // Prepare story entry for driver
      const storyEntry = {
        state,
        price: fare,
        description,
      };

      // Find existing driver by name
      let findDriver = await Driver.findOne({ name: driver.name });

      if (findDriver) {
        // Update existing driver's balance
        findDriver.balance += fare;

        // Faqat soldo false bo‘lsa, tarixga qo‘shiladi
        if (!driver.soldo) {
          findDriver.stroy.push(storyEntry);
        }

        await findDriver.save();

        return response.success(
          res,
          "Balans yangilandi" + (!driver.soldo ? " va tarix qo‘shildi" : ""),
          findDriver
        );
      }

      // Create new driver if not found
      const new_driver = await Driver.create({
        name: driver.name,
        phone: driver.phone || "",
        balance: fare,
        stroy: driver.soldo ? [] : [storyEntry], // story faqat soldo=false bo‘lsa yoziladi
      });

      // soldo true bo‘lsa, Expense yoziladi
      if (driver.soldo) {
        // Parse the month from driver.month
        const monthDate = new Date(driver.month);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth(); // 0-based (January = 0, February = 1)

        // Set start of the month (e.g., 2025-02-01T00:00:00.000Z)
        const fromDate = new Date(year, month, 1, 0, 0, 0, 0);

        // Set end of the month (e.g., 2025-02-28T23:59:59.999Z)
        const toDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const expense = await Expense.create({
          name: driver.name,
          amount: fare,
          type: "Chiqim",
          category: "Soldo",
          description: description || "Soldo to'lovi",
          date: new Date(),
          paymentType: "Naqd",
          relevantId: new_driver._id,
          soldoDate: {
            from: fromDate,
            to: toDate,
          },
        });

        if (!expense) {
          return response.error(res, "Xarajat yaratishda xatolik");
        }
      }

      response.success(res, "Yangi haydovchi yaratildi", new_driver);
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
