const Driver = require("../model/driversModel");
const Expense = require("../model/expense");
const { Order } = require("../model/orderSchema");
const response = require("../utils/response");
const mongoose = require("mongoose");

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
      let { driver, fare, state, description, selectedOrders } = req.body;

      // Validate required fields
      if (!driver?.name || !fare)
        return response.badRequest(res, "To‘liq ma'lumot kiriting");

      const storyEntry = {
        state,
        price: fare,
        description,
      };

      let findDriver = await Driver.findOne({ name: driver.name });

      if (findDriver) {
        findDriver.balance += fare;
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


      if (selectedOrders && selectedOrders.length > 0) {
        const objectIdOrders = selectedOrders.map(id => new mongoose.Types.ObjectId(id));
        const orders = await Order.find({ _id: { $in: objectIdOrders } });
        if (orders.length > 0) {
          const amountPerOrder = fare / orders.length;
          await Promise.all(
            orders.map(async (order) => {
              order.extraExpenses = (order.extraExpenses || 0) + amountPerOrder;
              await order.save();
            })
          );
        }
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



  async monthlyReportDriver(req, res) {
    try {
      const { month, year } = req.query;

      // Validate input
      if (!month || !year) {
        report.notFound({ message: 'Month and year are required' });
      }

      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (monthNum < 1 || monthNum > 12) {
        report.notFound({ message: 'Invalid month' });
      }

      // Define date range for the month
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      // Aggregate driver data
      const report = await Driver.aggregate([
        {
          $unwind: '$stroy' // Unwind the stroy array
        },
        {
          $match: {
            'stroy.date': {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              driverId: '$_id',
              name: '$name',
              balance: '$balance'
            },
            deliveryCount: { $sum: 1 },
            totalPrice: { $sum: '$stroy.price' }
          }
        },
        {
          $project: {
            _id: 0,
            driverId: '$_id.driverId',
            name: '$_id.name',
            deliveryCount: 1,
            totalPrice: 1,
            balance: '$_id.balance'
          }
        }
      ]);
      const drivers = {
        month: monthNum,
        year: yearNum,
        report: report.map(driver => ({
          driverId: driver.driverId,
          name: driver.name,
          deliveryCount: driver.deliveryCount,
          totalPrice: driver.totalPrice,
          balance: driver.balance
        }))
      };
      response.success(res, "Haydovchilar ro'yxati", drivers);
    } catch (error) {
      response.serverError(res, error.message);
    }
  };
}

module.exports = new DriverController();
