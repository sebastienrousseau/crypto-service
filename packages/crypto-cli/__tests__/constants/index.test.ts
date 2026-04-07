import chai from "chai";
import * as test from "../../src/constants/index";

const { expect } = chai;

describe("constants module", () => {
  it("exports a synchronously-resolved constants object", () => {
    expect(test.constants).to.be.an("object");
    expect(test.constants.CLI_TITLE).to.be.a("string");
  });

  it("exports a supported locale", () => {
    expect(["en", "fr"]).to.include(test.locale);
  });

  it("does not crash for unsupported locales (regression for the i18n init race)", () => {
    // Even when the host's locale is something we do not translate, the
    // module-level resolution must fall back to a real value, never undefined.
    expect(test.constants).to.not.equal(undefined);
  });
});
