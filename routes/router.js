const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const upload2 = multer();

// const adminController = require("../controller/adminController");
// const adminValidation = require("../validation/AdminValidation");
const workerController = require("../controller/workerController");
const OrderService = require("../controller/todoList");
const workerValidation = require("../validation/WorkerValidation");
const attendanceController = require("../controller/attendanceController");
const WorkingHoursController = require("../controller/workingHoursController");
const ExpenseController = require("../controller/expenseController");
const OrderController = require("../controller/orderController");
const BalanceController = require("../controller/BalanceController");
const storeController = require("../controller/storeController");
const storeValidation = require("../validation/storeValidation");
const optionController = require("../controller/shopsController");
const driverController = require("../controller/driverController");
const workingDays = require("../controller/WorkingDaysController"); // Yo'lni moslashtiring
const myDebtsController = require("../controller/myDebtController");
const myDebtValidation = require("../validation/myDebtValidation");

// Ish kunlari yaratish
router.post("/workingDays", workingDays.create);
router.get("/workingDays", workingDays.getAll);
router.delete("/workingDays/:id", workingDays.delete);
router.put("/workingDays/:id", workingDays.update);

// WORKER
router.get("/worker/all", workerController.getWorkers);
router.get("/workermain/all", workerController.getWorkerMain);
router.get("/worker/monthlyData", workerController.getWorkerMonthlyData);
router.get(
  "/worker/totalRemainingSalary",
  workerController.getTotalRemainingSalary
);
router.post(
  "/worker/create",
  upload.single("image"),
  workerValidation,
  workerController.createWorker
);
router.post("/worker/login", workerController.login);
router.delete("/worker/delete/:id", workerController.deleteWorker);
router.put("/worker/update/:id", workerController.updateWorker);
router.get("/workers/:workerId/salaries", workerController.getSalaries);
router.post("/workers/:workerId/salaries", workerController.createSalary);
router.delete(
  "/workers/:workerId/salaries/:salaryId",
  workerController.deleteSalary
);

// ATTENDANCE => DAVOMAT
router.get("/attendance/all", attendanceController.getAll);
router.get("/attendance/date/:date", attendanceController.getByDate);
router.get(
  "/attendance/monthly/:year/:month",
  attendanceController.getMonthlyAttendance
);
router.post("/attendance/create", attendanceController.create);
router.post("/attendance/update", attendanceController.updateAttendance);
router.put("/attendance/:id", attendanceController.updateByAttendance);

// STORE
router.get("/store/all", storeController.getStore);
router.get("/store/report", storeController.getStoreReport);
router.post("/store/create", storeValidation, storeController.createStore);
router.delete("/store/delete/:id", storeController.deleteStore);
router.put("/store/update/:id", storeController.updateStore);
router.get("/store/category/:category", storeController.getStoreByCategory);
router.put("/store/decrement/:id", storeController.decrementQuantity);
router.get("/store/byId/:id", storeController.getStoreById);
// Ko‘p mahsulotlarni yangilash yoki qo‘shish
router.post("/store/update-many", storeController.storeUpdateMany);

// Working Hours
router.post("/workingHours/create", WorkingHoursController.createWorkingHours);
router.get("/workingHours/", WorkingHoursController.getAllWorkingHours);
router.get("/workingHours/:id", WorkingHoursController.getWorkingHoursById);
router.put("/workingHours/:id", WorkingHoursController.updateWorkingHours);
router.delete("/workingHours/:id", WorkingHoursController.deleteWorkingHours);

// Expenses
router.post("/expenses", ExpenseController.createExpense);
router.get("/expenses", ExpenseController.getAllExpenses);
router.get("/expenses/:id", ExpenseController.getExpenseById);
router.put("/expenses/:id", ExpenseController.updateExpense);
router.delete("/expenses/:id", ExpenseController.deleteExpense);
router.post("/expenses/period", ExpenseController.getExpensesByPeriod);
router.post("/expenses/report", ExpenseController.getBalanceReport);
router.get(
  "/expenses/relevant/:relevantId",
  ExpenseController.getExpenseByRelevantId
);
// /expenses?date=2025-02-02
router.get("/expenses-by-salary", ExpenseController.getExpensesBySalary);
router.get("/expensesMonthlyReport", ExpenseController.getMonthlyReport);

// Orders
router.get("/order/", OrderController.getOrders);
router.get("/orderId/:id", OrderController.getOrderById);
router.post(
  "/order/",
  upload2.array("images", 10),
  OrderController.createOrder
);
router.delete(
  "/orderIntoInfo/:infoId/orders/:orderId",
  OrderController.deleteOrderIntoInfo
);
router.post(
  "/orderIntoInfo/:infoId",
  upload.single("image"),
  OrderController.createOrderIntoInfo
);

router.put("/order/:id", OrderController.updateOrder);
router.delete("/order/:id", OrderController.deleteOrder);
router.post("/order/giveMaterial", OrderController.giveMaterial);
router.post("/order/giveMaterialSoldo", OrderController.giveMaterialSoldo);
router.get("/order/progress/:orderId", OrderController.orderProgress);
router.get(
  "/order/get-material/:orderId/:materialId",
  OrderController.getMaterialById
);
router.get(
  "/order/get-all-material/:orderId",
  OrderController.getAllMaterialById
);
router.get("/order-debt", OrderController.calculateDebt);
router.get("/ordergetdebtors", OrderController.getDebtorOrders);
router.post(
  "/order/additional/material",
  OrderController.createAdditionalMaterial
);
router.put(
  "/ordfermain/:orderId/material/:materialId/:orderCardId",
  OrderController.updateMaterialGiven
);
router.put("/orderGiven/:id", OrderController.editGivnMaterial);
// Buyurtmani yakunlash va materiallarni yangilash
router.post("/complete-order", OrderController.completeOrder);

// New orders list
router.post("/list", OrderService.createOrder);
router.get("/list", OrderService.getOrders);
router.get("/list/new", OrderService.getNewOrders);
router.get("/list/:id", OrderService.getOrderById);
router.patch("/list/:id", OrderService.updateOrder);
router.delete("/list/:id", OrderService.deleteOrder);
router.get("/list-history", OrderService.getOrderHistory);
router.delete(
  "/list/:orderId/materials/:materialId",
  OrderService.deleteMaterialById
);
router.put(
  "/list/:orderId/materials/:materialId",
  OrderService.updateMaterialById
);
router.delete("/list/:orderId/materials", OrderService.deleteAllMaterials);
router.post("/list/:orderId/materials", OrderService.createMaterial);

router.get("/balance", BalanceController.getBalance);
router.post("/balance/update", BalanceController.updateBalance);

// shops
router.get("/shops", optionController.getAllOptions);
router.post("/shops", optionController.addOption);
router.delete("/shops/:id", optionController.deleteOption);

const orderShops = require("../controller/shopsCtrl");

router.post("/newShops/", orderShops.createOrder);
router.post("/newShopsSoldo/", orderShops.createOrderSoldo);
router.get("/newShops/", orderShops.getAllOrders);
router.get("/newShops/shop/:shopsId", orderShops.getOrdersByShop);
router.get("/newShops/unpaid/total/:shopsId", orderShops.getUnpaidTotalByShop);
router.get("/newShops/unpaid/total", orderShops.getUnpaidTotal);
router.put("/newShops/:id", orderShops.updateOrder);
router.delete("/newShops/:id", orderShops.deleteOrder);
router.post("/newShops/:orderId/materials", orderShops.addMaterial);
router.delete(
  "/newShops/:orderId/materials/:materialId",
  orderShops.deleteMaterial
);
router.get("/getshopsbyisPaid", orderShops.getOrdersByisPaid);
// getAggregatedOrders && processPayment &&  getReturnedOrders && processReturnedPay
router.get("/newShops/getAggregatedOrders", orderShops.getAggregatedOrders);
router.post("/newShops/processPayment", orderShops.processPayment);
router.get("/newShops/getReturnedOrders", orderShops.getReturnedOrders);
router.post("/newShops/processReturnedPay", orderShops.processReturnedPay);
//   const { year, month } = req.query; generateMonthlyReport
router.get("/newShops/generateMonthlyReport", orderShops.generateMonthlyReport);

// driver
router.get("/driver/all", driverController.getDrivers);
router.post("/driver/create", driverController.createDriver);
router.delete("/driver/delete/:id", driverController.deleteDriver);
router.put("/driver/increment/:id", driverController.incementBalance);
router.put("/driver/decrement/:id", driverController.decrementBalance);
router.get("/driver/monthly-report", driverController.monthlyReportDriver);

// my debts
router.get("/myDebts/all", myDebtsController.getMyDebts);
router.get("/myDebts", myDebtsController.getIsPaidFalse);
router.get(
  "/myDebts/monthly-report",
  myDebtsController.myDebtReport.bind(myDebtsController)
);
router.post("/myDebts/create", myDebtsController.postMyDebt);
router.put("/myDebts/payment/:id", myDebtsController.paymentForDebt);
router.put("/myDebts/:id", myDebtsController.updateMyDebt);

module.exports = router;
