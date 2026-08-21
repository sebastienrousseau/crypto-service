const base = require("@sebastienrousseau/mocha-config");

module.exports = {
  ...base,
  // Override spec to exclude fixture files (.key, .pub, .cert) that the
  // default __tests__/** glob picks up and tries to require as JS.
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.js"],
  require: ["ts-node/register/transpile-only"],
};
