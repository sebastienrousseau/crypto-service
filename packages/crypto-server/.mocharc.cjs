const base = require("@sebastienrousseau/mocha-config");

// The server refuses unauthenticated requests unless anonymous access is
// enabled explicitly. Most suites exercise routes without credentials, so
// enable it for the test run; auth tests override it per case.
process.env.ALLOW_ANONYMOUS = process.env.ALLOW_ANONYMOUS ?? "1";

// Most suites send far more than the production default of 10 requests a
// minute from one address; rate-limit.test.ts clears this to test the
// real default.
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? "100000";
module.exports = {
  ...base,
  // Use transpile-only so ts-node does not type-check compiled JS
  // from workspace dependencies (crypto-lib dist/).
  require: ["ts-node/register/transpile-only"],
  timeout: 60000,
};
