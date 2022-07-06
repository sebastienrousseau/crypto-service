import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { welcome } from '../../src/helpers/banner';
import { assert } from 'chai';
// import { constants } from "../../src/constants/index";
chai.use(chaiAsPromised);
const { expect } = chai;

describe("Checking if welcome function is defined", function () {
  it("should be defined", () => {
    assert.isFunction(welcome)
  });
});

describe("Checking if welcome function is not null", function () {
  it("should not be null", () => {
    assert.isNotNull(welcome)
  });
});

describe("Expect welcome to be a promise", function () {
  it("should be a promise", () => {
    expect(Promise.resolve()).to.be.a('promise');
  });
});

describe("Checking if console is cleared", function () {
  it("should be cleared", () => {
    expect(welcome).contains(console.clear);
  });
});

describe("Checking if console is showing the banner", function () {
  it("should be showing the banner", () => {
    expect(welcome).contains(console.log);
  });
});


describe("Checking if console banner output is a string", function () {
  it("Should return a string value", () => {
    expect(Promise.resolve(welcome)).to.eventually.be.a("string");
  });
});

describe("Checking figlet function returns the correct value", function () {
  it('should return the correct value', () => {
    const test = welcome('Hello').then(value => {
      return value;
    });
    expect(test).to.eventually.equal('Hello');
  });
});

describe("Checking value is not null", function () {
  it('should not be null', () => {
    const data='';
    const test = welcome(data).then(value => {
      return value;
    });
    expect(test).to.not.be.null;
  });
});

