module.exports = {
  spec: ["./__tests__/**/*.test.ts"],
  require: ["ts-node/register/transpile-only"],
  timeout: 10000,
};
