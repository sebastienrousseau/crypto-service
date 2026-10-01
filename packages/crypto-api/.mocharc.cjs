const base = require("@sebastienrousseau/mocha-config");
const os = require("os");
const path = require("path");

// Generated markdown goes to a temp directory during tests, not into the
// committed src/docs directory.
process.env.CRYPTO_API_DOCS_DIR =
  process.env.CRYPTO_API_DOCS_DIR ??
  path.join(os.tmpdir(), "crypto-api-test-docs");

module.exports = {
  ...base,
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.js"],
  require: ["ts-node/register/transpile-only"],
};
