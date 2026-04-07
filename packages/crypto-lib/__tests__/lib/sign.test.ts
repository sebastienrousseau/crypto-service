import { sign } from "../../src/lib/sign";
import { verify } from "../../src/lib/verify";
import { generate } from "../../src/lib/generate";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("sign", function () {
  this.timeout(60_000);

  it("produces a cleartext-signed message that verify accepts", async function () {
    const key = await generate({
      name: "Signer",
      email: "signer@example.com",
      passphrase: "pp",
    });
    const signed = await sign({
      message: "the message",
      signingKey: { armored: key.privateKey, passphrase: "pp" },
    });
    expect(signed).to.match(/BEGIN PGP SIGNED MESSAGE/);

    const result = await verify({
      message: signed,
      verificationKey: key.publicKey,
    });
    expect(result.valid).to.equal(true);
  });

  it("respects the detached flag (the previous signOptions && {…} discarded it)", async function () {
    const key = await generate({
      name: "Signer",
      email: "signer@example.com",
      passphrase: "pp",
    });
    const detached = await sign({
      message: "the message",
      signingKey: { armored: key.privateKey, passphrase: "pp" },
      detached: true,
    });
    expect(detached).to.match(/BEGIN PGP SIGNATURE/);
    expect(detached).to.not.match(/BEGIN PGP SIGNED MESSAGE/);

    const result = await verify({
      message: "the message",
      signature: detached,
      verificationKey: key.publicKey,
    });
    expect(result.valid).to.equal(true);
  });
});
