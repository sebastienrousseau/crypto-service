const base = require("@sebastienrousseau/mocha-config");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Generated markdown goes to a temp directory during tests, not into the
// committed src/docs directory.
// Each run gets its own, removed at exit, so concurrent runs do not share it.
if (!process.env.CRYPTO_API_DOCS_DIR) {
  const docsDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "crypto-api-test-docs-"),
  );
  process.on("exit", () =>
    fs.rmSync(docsDir, { recursive: true, force: true }),
  );
  process.env.CRYPTO_API_DOCS_DIR = docsDir;
}

module.exports = {
  ...base,
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.js"],
  require: ["ts-node/register/transpile-only"],
};
