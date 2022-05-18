import CryptoServer from "../src/bin/crypto-server.js"
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
describe("Running Initialization tests \n", function() {
  it('should asserts CryptoServer is truthy', function () {
    expect(CryptoServer).to.be.ok;
    expect(CryptoServer).to.exist;
  });
});

// CryptoServer() test
describe("CryptoServer() test", function() {
    it("should be a promise", function () {
      expect(Promise.resolve()).to.be.a("promise");
    });
});
