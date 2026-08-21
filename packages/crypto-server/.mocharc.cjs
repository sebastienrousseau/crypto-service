const base = require("@sebastienrousseau/mocha-config");
module.exports = {
  ...base,
  // Use transpile-only so ts-node does not type-check compiled JS
  // from workspace dependencies (crypto-lib dist/).
  require: ["ts-node/register/transpile-only"],
};
