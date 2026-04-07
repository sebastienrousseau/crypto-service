import { reformat } from "../../src/lib/reformat";
import { generate } from "../../src/lib/generate";
import * as openpgp from "openpgp";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("reformat", function () {
  this.timeout(60_000);

  it("returns a real reformatted key with the new user ID", async function () {
    const original = await generate({
      name: "Old Name",
      email: "old@example.com",
      passphrase: "pp",
    });
    const result = await reformat({
      privateKey: { armored: original.privateKey, passphrase: "pp" },
      name: "New Name",
      email: "new@example.com",
    });

    expect(result.publicKey).to.match(/BEGIN PGP PUBLIC KEY BLOCK/);
    expect(result.privateKey).to.match(/BEGIN PGP PRIVATE KEY BLOCK/);

    const parsed = await openpgp.readKey({ armoredKey: result.publicKey });
    const userIDs = parsed.getUserIDs();
    expect(userIDs.some((u) => u.includes("new@example.com"))).to.equal(true);
  });
});
