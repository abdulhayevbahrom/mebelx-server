const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const storeValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, errorMessage: "Ism majburiy" },
      debts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number", errorMessage: "Qarz summasi raqam bo'lishi kerak" },
            date: { type: "string", format: "date-time", errorMessage: "Sana noto'g'ri formatda" }
          },
          required: ["amount"],
          additionalProperties: false
        },
        errorMessage: "Qarzlar noto‘g‘ri kiritilgan"
      },
      isPaid: { type: "boolean", errorMessage: "To‘langanmi qiymati faqat true yoki false bo‘lishi kerak" },
      description: { type: "string", errorMessage: "Izoh noto‘g‘ri formatda" },
      type: {
        type: "string",
        enum: ["naqt", "dollar"],
        errorMessage: "To‘lov turi faqat 'naqt' yoki 'dollar' bo‘lishi kerak"
      },
      payments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number", errorMessage: "To‘lov summasi raqam bo'lishi kerak" },
            date: { type: "string", format: "date-time", errorMessage: "Sana noto‘g‘ri formatda" }
          },
          required: ["amount"],
          additionalProperties: false
        },
        errorMessage: "To‘lovlar noto‘g‘ri kiritilgan"
      }
    },
    required: ["name", "type"],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: "Ism kiritilishi shart",
        type: "To‘lov turi kiritilishi shart"
      },
      properties: {
        name: "Ism noto‘g‘ri formatda",
        type: "To‘lov turi noto‘g‘ri formatda"
      }
    }
  };

  const validate = ajv.compile(schema);
  const result = validate(req.body);
  if (!result) {
    return response.error(res, validate.errors[0].message);
  }
  next();
};

module.exports = storeValidation;


