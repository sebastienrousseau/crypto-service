import CryptoLib from "../src/index";
import {
  decrypt,
  encrypt,
  generate,
  reformat,
  revoke,
  session,
  sign,
  verify,
} from "../src/index";
import chai from "chai";

const { expect } = chai;

describe("index re-exports", function () {
  it("exposes the public API as named exports", function () {
    expect(generate).to.be.a("function");
    expect(encrypt).to.be.a("function");
    expect(decrypt).to.be.a("function");
    expect(sign).to.be.a("function");
    expect(verify).to.be.a("function");
    expect(revoke).to.be.a("function");
    expect(reformat).to.be.a("function");
    expect(session).to.be.a("function");
  });

  it("exposes the same API as the default export", function () {
    expect(CryptoLib.generate).to.equal(generate);
    expect(CryptoLib.encrypt).to.equal(encrypt);
    expect(CryptoLib.decrypt).to.equal(decrypt);
    expect(CryptoLib.sign).to.equal(sign);
    expect(CryptoLib.verify).to.equal(verify);
  });

  it("does not write files at import time", function () {
    // Smoke check — if importing had side effects, the dataclasses below
    // would already exist on the filesystem.
    const fs = require("fs");
    expect(fs.existsSync("./encrypted.txt")).to.equal(false);
    expect(fs.existsSync("./decrypted.txt")).to.equal(false);
  });
});
