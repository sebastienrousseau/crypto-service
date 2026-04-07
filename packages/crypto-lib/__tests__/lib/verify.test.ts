import { verify } from "../../src/lib/verify";
import { sign } from "../../src/lib/sign";
import { generate } from "../../src/lib/generate";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("verify", function () {
  this.timeout(60_000);

  it("rejects unsigned plaintext (the previous implementation accepted any string)", async function () {
    const key = await generate({
      name: "V",
      email: "v@example.com",
      passphrase: "pp",
    });
    await expect(
      verify({
        message: "hello",
        verificationKey: key.publicKey,
      }),
    ).to.be.rejected;
  });

  it("rejects a signature made by a different key", async function () {
    const alice = await generate({
      name: "Alice",
      email: "alice@example.com",
      passphrase: "pp",
    });
    const mallory = await generate({
      name: "Mallory",
      email: "mallory@example.com",
      passphrase: "pp",
    });
    const signed = await sign({
      message: "hello",
      signingKey: { armored: mallory.privateKey, passphrase: "pp" },
    });
    await expect(
      verify({
        message: signed,
        verificationKey: alice.publicKey,
      }),
    ).to.be.rejected;
  });

  it("accepts a valid cleartext signature", async function () {
    const key = await generate({
      name: "V",
      email: "v@example.com",
      passphrase: "pp",
    });
    const signed = await sign({
      message: "hello",
      signingKey: { armored: key.privateKey, passphrase: "pp" },
    });
    const result = await verify({
      message: signed,
      verificationKey: key.publicKey,
    });
    expect(result.valid).to.equal(true);
    expect(result.signedBy).to.be.a("string");
  });
});
