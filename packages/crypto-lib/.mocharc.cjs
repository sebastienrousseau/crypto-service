const base = require("@sebastienrousseau/mocha-config");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Test environment, set here in Node rather than in the package.json
// script so the suite runs on Windows too. Keys come from the synthetic
// fixtures; generated keys and signatures go to a temp directory, never
// into the source tree.
const outDir = path.join(os.tmpdir(), "crypto-lib-test-out");
fs.mkdirSync(outDir, { recursive: true });
// Always overridden, as the old script did: a shell that points
// CRYPTO_KEY_DIR at real keys must not leak into the tests.
process.env.CRYPTO_KEY_DIR = path.join(
  __dirname,
  "__tests__",
  "fixtures",
  "keys",
);
process.env.CRYPTO_KEY_OUT_DIR = outDir;
process.env.CRYPTO_DATA_DIR = outDir;

module.exports = {
  ...base,
  // Override spec to exclude fixture files (.key, .pub, .cert) that the
  // default __tests__/** glob picks up and tries to require as JS.
  spec: ["./__tests__/**/*.test.ts", "./__tests__/**/*.test.js"],
  require: ["ts-node/register/transpile-only"],
};
