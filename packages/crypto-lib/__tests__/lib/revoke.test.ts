import { revoke } from "../../src/lib/revoke"
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { _resetKeystoreForTests } from "../../src/key/keystore";
chai.use(chaiAsPromised);
const { expect } = chai;

const data = {
  date: new Date(),
  passphrase: '123456789abcdef',
  flag: 0,
  reason: 'this is a test reason',
};


describe('revoke', function () {
  before(() => { _resetKeystoreForTests(); });
  after(() => { _resetKeystoreForTests(); });

  it('should revoke a key', async function () {
    const test = revoke(data)
    await expect(test).to.eventually.be.fulfilled;
  });
});
