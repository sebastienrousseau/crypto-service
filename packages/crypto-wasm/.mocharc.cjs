module.exports = {
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.js"],
  require: ["ts-node/register/transpile-only"],
  timeout: 10000,
};
