import { revoke } from "../../src/cryptolib"
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
const passphrase = '123456789abcdef';

describe('revoke', function () {
  it('should revoke a key', async function () {
    const test = revoke({ passphrase })
    await expect(test).to.eventually.be.fulfilled;
  });
});
