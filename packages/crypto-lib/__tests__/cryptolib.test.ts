import CryptoLib from "../src/bin/cryptolib";
import chai from "chai";

const { expect } = chai;

describe("cryptolib bin entry", function () {
  it("exposes the eight pure functions", function () {
    for (const name of [
      "encrypt",
      "decrypt",
      "generate",
      "sign",
      "verify",
      "revoke",
      "reformat",
      "session",
    ] as const) {
      expect(CryptoLib[name]).to.be.a("function");
    }
  });
});
