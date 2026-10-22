// Known-answer (NIST ACVP, Wycheproof) and cross-implementation suites,
// run by `pnpm test` after the coverage run and without coverage: they
// exercise @noble/post-quantum's Keccak heavily, which V8's coverage
// instrumentation slows about 23 times. The coverage run reaches 100%
// without them. Same environment as .mocharc.cjs.
const config = require("./.mocharc.cjs");

module.exports = {
  ...config,
  spec: ["./__tests__/vectors/**/*.test.ts"],
  ignore: [],
};
