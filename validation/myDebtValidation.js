const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const storeValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      amount: { type: "number" },
      description: { type: "string" },
      type: { type: "string" },
    },
    required: ["name", "amount"],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: "Kimdan olindi",
        amount: "Qarz miqdori",
        type: "To'lov turi",
      },
      properties: {
        name: "Kimdan olindi",
        amount: "Qarz miqdori",
        description: "Qo'shimcha ma'lumot",
        type: "To'lov turi",
      },
    },
  };
  const validate = ajv.compile(schema);
  const result = validate(req.body);
  if (!result) {
    return response.error(res, validate.errors[0].message);
  }
  next();
};

module.exports = storeValidation;
