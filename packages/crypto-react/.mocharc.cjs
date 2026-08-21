const base = require("@sebastienrousseau/mocha-config");

module.exports = {
  ...base,
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.tsx"],
  require: ["ts-node/register/transpile-only"],
};
