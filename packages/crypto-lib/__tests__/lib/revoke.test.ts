import { revoke } from "../../src/bin/cryptolib"
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;

const data = {
  date: new Date(),
  passphrase: '123456789abcdef',
  flag: 0,
  reason: 'this is a test reason',
};


describe('revoke', function () {
  it('should revoke a key', async function () {
    const test = revoke(data)
    await expect(test).to.eventually.be.fulfilled;
  });
});
