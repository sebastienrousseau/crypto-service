import CryptoCore from "../src/bin/crypto-core.js";
import * as chai from "chai";

let expect = chai.expect;
let assert = chai.assert;

// mocha() test
describe("Running mocha () ", function () {
  it("should run mocha", function () {
    expect(true);
  });
});

// Initialization test
describe("Running Initialization tests \n", function () {
  it("should asserts CryptoCore is truthy", function () {
    expect(CryptoCore).to.be.ok;
    expect(CryptoCore).to.exist;
  });
});

// CryptoCore() test
describe("CryptoCore() test", function () {
  it("should be a promise", function () {
    expect(Promise.resolve()).to.be.a("promise");
  });
});
