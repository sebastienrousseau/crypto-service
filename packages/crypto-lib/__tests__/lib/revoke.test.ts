import { revoke } from "../../src/bin/cryptolib"
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
const passphrase = '123456789abcdef';
const flag = 0;
const reason = 'test';

describe('revoke', function () {
  it('should revoke a key', async function () {
    const test = revoke({ passphrase, flag, reason })
    await expect(test).to.eventually.be.fulfilled;
  });
});
