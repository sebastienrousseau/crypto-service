import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import * as test from "../../src/constants/index";
chai.use(chaiAsPromised);
const {expect} = chai;

describe("Checking constants format", function () {
  it("should be an object", () => {
    expect(test).to.be.an("object");
  });
});

describe("Checking locale response", function () {
  it("should return the correct locale response", () => {
    if (test.locale.toLowerCase() === "en") {
      expect(test.locale).to.equal("en");
    }
    else if (test.locale.toLowerCase() === "fr") {
      expect(test.locale).to.equal("fr");
    }
    else {
      expect(test.locale).to.equal("en");
    }
  });
});

describe('Checking switch case options', () => {
  it('should report cases not aligned with switch keyword', function () {
    switch (test.locale.toLowerCase()) {
      case 'en':
        expect(test.locale).to.equal("en");
        break;
      case 'fr':
        expect(test.locale).to.equal("fr");
        break;
      default:
        expect(test.locale).to.equal("en");
        break;
    }
  });
});


