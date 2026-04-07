import { generate } from "../../src/lib/generate";
import * as openpgp from "openpgp";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("generate", function () {
  this.timeout(60_000);

  it("requires name and email", async function () {
    await expect(
      // @ts-expect-error — testing runtime guard
      generate({}),
    ).to.be.rejectedWith(/name and email are required/);
  });

  it("generates an ECC key by default", async function () {
    const key = await generate({
      name: "Jane Doe",
      email: "jane@doe.com",
      passphrase: "test-passphrase",
    });
    expect(key.publicKey).to.match(/BEGIN PGP PUBLIC KEY BLOCK/);
    expect(key.privateKey).to.match(/BEGIN PGP PRIVATE KEY BLOCK/);
    expect(key.revocationCertificate).to.match(/BEGIN PGP PUBLIC KEY BLOCK/);
  });

  it("honours rsaBits = 4096 (the previous Math.min capped to 2048)", async function () {
    this.timeout(180_000);
    const key = await generate({
      name: "Jane Doe",
      email: "jane@doe.com",
      passphrase: "test-passphrase",
      type: "rsa",
      rsaBits: 4096,
    });
    const parsed = await openpgp.readKey({ armoredKey: key.publicKey });
    const algo = await parsed.getAlgorithmInfo();
    expect(algo.bits).to.equal(4096);
  });

  it("honours keyExpirationTime (the previous Math.min collapsed to 0)", async function () {
    const oneYear = 60 * 60 * 24 * 365;
    const key = await generate({
      name: "Jane Doe",
      email: "jane@doe.com",
      passphrase: "test-passphrase",
      keyExpirationTime: oneYear,
    });
    const parsed = await openpgp.readKey({ armoredKey: key.publicKey });
    const exp = await parsed.getExpirationTime();
    expect(exp).to.be.instanceOf(Date);
  });
});
