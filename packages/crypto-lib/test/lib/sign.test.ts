import { sign } from "../../src/cryptolib"
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
const message = 'Hello Crypto Service APIs!';
const passphrase = '123456789abcdef';

describe('sign', function () {
  it('should sign a message', async function () {
    const test = sign({ passphrase, message });
    await expect(test).to.eventually.be.fulfilled;
  });
});
