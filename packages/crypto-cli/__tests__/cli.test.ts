import * as test from "../src/constants/index";
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const {expect} = chai;

describe("Checking that locale is retrieved correctly", () => {
  it("should be correct", () => {
    if (Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2) === "en") {
      expect(test.locale).to.equal("en");
    }
    else if (Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2) === "fr") {
      expect(test.locale).to.equal("fr");
    }
  });
});
