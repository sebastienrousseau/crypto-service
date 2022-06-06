import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

const {expect} = chai;
// mocha() test
describe("Running mocha () ", function () {
  it("should run mocha", function () {
    expect(true);
  });
});
