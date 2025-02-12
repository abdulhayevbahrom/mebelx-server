const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const adminValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      firstName: { type: "string", minLength: 2, maxLength: 50 },
      lastName: { type: "string", minLength: 2, maxLength: 50 },
      dayOfBirth: { type: "string", format: "date" },
      phone: { type: "string", minLength: 9, maxLength: 9 },
      salary: { type: "number" },
      password: {
        type: "string",
        minLength: 6,
        maxLength: 15,
        pattern: "^[a-zA-Z0-9]{6,15}$",
      },
      login: {
        type: "string",
        minLength: 6,
        maxLength: 15,
        pattern: "^[a-zA-Z0-9]{6,15}$",
      },
      role: {
        type: "string",
        enum: ["manager", "seller", "director", "accountant", "warehouseman", "deputy_director"],
        default: "director",
      },
    },
    required: [
      "firstName",
      "lastName",
      "dayOfBirth",
      "phone",
      "password",
      "login",
      "role",
    ],
    additionalProperties: false,
    errorMessage: {
      required: {
        firstName: "Ism kiritish shart",
        lastName: "Familiya kiritish shart",
        dayOfBirth: "Tug‘ilgan sana kiritish shart",
        phone: "Telefon raqam kiritish shart, masalan: 939119572",
        password: "Parol kiritish shart",
        login: "Login kiritish shart",
        role: "Role kiritish shart, [accountant, manager, director, seller]",
      },
      properties: {
        firstName: "Ism noto‘g‘ri formatda",
        lastName: "Familiya noto‘g‘ri formatda",
        dayOfBirth: "Tug‘ilgan sana noto‘g‘ri formatda, (masalan: 2000-01-01)",
        phone: "Telefon raqam noto‘g‘ri formatda, masalan: 939119572",
        password:
          "Parol noto‘g‘ri formatda, eng kamida 6 ta belgidan iborat bo‘lishi kerak",
        login:
          "Login noto‘g‘ri formatda, eng kamida 6 ta belgidan iborat bo‘lishi kerak",
        role: "Role noto‘g‘ri, masalan [accountant, manager, director, seller]",
      },
    },
  };
  const validate = ajv.compile(schema);
  const result = validate(req.body);
  if (!result) {
    return response.error(
      res,
      "Tasdiqlashda xatolik",
      validate.errors[0].message
    );
  }
  next();
};

module.exports = adminValidation;
