const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const workerValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      firstName: { type: "string", minLength: 2, maxLength: 50 },
      lastName: { type: "string", minLength: 2, maxLength: 50 },
      middleName: { type: "string", minLength: 2, maxLength: 50 },
      dayOfBirth: { type: "string", format: "date" },
      phone: { type: "string", minLength: 9, maxLength: 9, pattern: "^[0-9]{9}$" },
      address: { type: "string" },
      password: { type: "string" },
      login: { type: "string" },
      role: {
        type: "string",
        enum: [
          "manager",
          "distributor",
          "director",
          "accountant",
          "warehouseman",
          "deputy",
          "worker",
        ],
      },
      workerType: { type: "string" },
      idNumber: {
        type: "string",
        minLength: 9,
        maxLength: 9,
        pattern: "^[A-Z]{2}[0-9]{7}$",
      },
      image: { type: "string" },
      salary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            salary: { type: "string", pattern: "^[0-9]+$" }, // Raqamli string
          },
          required: ["salary"],
          additionalProperties: false,
        },
        maxItems: 1, // Faqat bitta salary ob'ekti ruxsat etiladi
      },
    },
    required: ["firstName", "lastName", "dayOfBirth", "phone", "idNumber"],
    additionalProperties: false,
    errorMessage: {
      required: {
        firstName: "Ism kiritish shart",
        lastName: "Familiya kiritish shart",
        dayOfBirth: "Tug‘ilgan sana kiritish shart",
        phone: "Telefon raqam kiritish shart, masalan: 939119572",
        idNumber: "ID raqam kiritish shart, masalan: AD1234567",
      },
      properties: {
        firstName: "Ism noto‘g‘ri formatda",
        lastName: "Familiya noto‘g‘ri formatda",
        dayOfBirth: "Tug‘ilgan sana noto‘g‘ri formatda, (masalan: 2000-01-01)",
        phone: "Telefon raqam noto‘g‘ri formatda, masalan: 939119572",
        idNumber: "ID raqam noto‘g‘ri formatda, masalan: AD1234567",
        salary: "Maosh noto‘g‘ri formatda, faqat raqamli string bo‘lishi kerak",
      },
    },
  };

  const validate = ajv.compile(schema);
  let data = JSON.parse(JSON.stringify(req.body));

  const result = validate(data);
  if (!result) {
    return response.error(res, validate.errors[0].message);
  }
  next();
};

module.exports = workerValidation;