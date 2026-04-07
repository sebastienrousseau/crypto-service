import { session } from "../../src/lib/session";
import { generate } from "../../src/lib/generate";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("session", function () {
  this.timeout(60_000);

  it("returns a session key for a freshly generated public key", async function () {
    const recipient = await generate({
      name: "R",
      email: "r@example.com",
      passphrase: "pp",
    });
    const sk = await session({
      encryptionKey: recipient.publicKey,
      name: "R",
      email: "r@example.com",
    });
    expect(sk.algorithm).to.be.a("string");
    expect(sk.data).to.be.instanceOf(Uint8Array);
    expect(sk.data.length).to.be.greaterThan(0);
  });
});
