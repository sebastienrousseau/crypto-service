import chai from "chai";
import { welcome } from "../../src/helpers/banner";

const { expect } = chai;

describe("welcome banner", () => {
  it("is a function", () => {
    expect(welcome).to.be.a("function");
  });

  it("renders without throwing for an empty string", () => {
    // welcome() prints to stdout via figlet — we just want to know it doesn't
    // throw and that it returns synchronously now (no more async race).
    expect(() => welcome("")).to.not.throw();
  });

  it("renders without throwing for a custom title", () => {
    expect(() => welcome("Hello")).to.not.throw();
  });
});
