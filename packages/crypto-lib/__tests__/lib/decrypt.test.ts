import { decrypt } from "../../src/lib/decrypt";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("decrypt", function () {
  it("rejects empty input", async function () {
    await expect(
      // @ts-expect-error — testing runtime guard
      decrypt({}),
    ).to.be.rejectedWith(/encryptedMessage and decryptionKey are required/);
  });

  it("rejects malformed armor", async function () {
    await expect(
      decrypt({
        encryptedMessage: "not-an-armored-message",
        decryptionKey: { armored: "also-bogus", passphrase: "x" },
      }),
    ).to.be.rejected;
  });
});
