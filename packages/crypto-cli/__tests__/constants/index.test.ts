import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import * as test from "../../src/constants/index";
chai.use(chaiAsPromised);
const {expect} = chai;

describe("Checking language function", function () {
  it("should be a function", function () {
    expect(test.language).to.be.an("function");
  });
});


describe("Checking language function returns correct content", function () {
  it("should be correct", function () {
    const languages = ["en", "fr"];
    languages.forEach(function (language) {
      test.language(language);
      expect(test.constants).to.be.an("object");
    });
  });
});



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


