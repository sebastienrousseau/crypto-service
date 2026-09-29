const base = require("@sebastienrousseau/mocha-config");

module.exports = {
  ...base,
  spec: ["./__tests__/**/*.test.ts"],
  require: ["ts-node/register/transpile-only"],
  timeout: 15000,
};

