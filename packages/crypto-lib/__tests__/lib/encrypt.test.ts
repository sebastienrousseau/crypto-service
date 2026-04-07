import { encrypt } from "../../src/lib/encrypt";
import { decrypt } from "../../src/lib/decrypt";
import { generate } from "../../src/lib/generate";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("encrypt -> decrypt round-trip", function () {
  this.timeout(60_000);

  it("preserves plaintext through an ECC keypair", async function () {
    const key = await generate({
      name: "Round Trip",
      email: "rt@example.com",
      passphrase: "pp",
    });
    const ciphertext = await encrypt({
      message: "Hello Crypto Service Suite APIs!",
      encryptionKey: key.publicKey,
    });
    expect(ciphertext).to.match(/BEGIN PGP MESSAGE/);

    const result = await decrypt({
      encryptedMessage: ciphertext,
      decryptionKey: { armored: key.privateKey, passphrase: "pp" },
    });
    expect(result.data).to.equal("Hello Crypto Service Suite APIs!");
    expect(result.signatures).to.deep.equal([]);
  });

  it("verifies an embedded signature when verificationKey is supplied", async function () {
    const sender = await generate({
      name: "Sender",
      email: "s@example.com",
      passphrase: "pp",
    });
    const recipient = await generate({
      name: "Recipient",
      email: "r@example.com",
      passphrase: "pp",
    });

    const ciphertext = await encrypt({
      message: "signed-and-encrypted",
      encryptionKey: recipient.publicKey,
      signingKey: { armored: sender.privateKey, passphrase: "pp" },
    });

    const result = await decrypt({
      encryptedMessage: ciphertext,
      decryptionKey: { armored: recipient.privateKey, passphrase: "pp" },
      verificationKey: sender.publicKey,
    });
    expect(result.data).to.equal("signed-and-encrypted");
    expect(result.signatures).to.have.lengthOf(1);
    expect(result.signatures[0].valid).to.equal(true);
  });

  it("rejects empty input", async function () {
    await expect(
      // @ts-expect-error — testing runtime guard
      encrypt({}),
    ).to.be.rejectedWith(/message and encryptionKey are required/);
  });
});
