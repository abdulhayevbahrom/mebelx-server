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
      category: { type: "string" },
      quantity: { type: "number" },
      unit: { type: "string" },
      pricePerUnit: { type: "number" },
      totalPrice: { type: "number" },
      supplier: { type: "string" },
    },
    required: [
      "name",
      "category",
      "quantity",
      "unit",
      "pricePerUnit",
      "supplier",
    ],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: "Mahsulot nomi kiritish shart",
        category: "Kategoriya kiritish shart",
        quantity: "Miqdori kiritish shart",
        unit: "O‘lchov birligi kiritish shart",
        pricePerUnit: "Birlik narxi kiritish shart",
        totalPrice: "Jami narx kiritish shart",
        supplier: "Yetkazib beruvchi kiritish shart",
      },
      properties: {
        name: "Mahsulot nomi kiritish shart",
        category: "Kategoriya kiritish shart",
        quantity: "Miqdori kiritish shart",
        unit: "O‘lchov birligi kiritish shart",
        pricePerUnit: "Birlik narxi kiritish shart",
        totalPrice: "Jami narx kiritish shart",
        supplier: "Yetkazib beruvchi kiritish shart",
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

module.exports = storeValidation;
