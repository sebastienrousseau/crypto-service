import { revoke } from "../../src/lib/revoke";
import { generate } from "../../src/lib/generate";
import * as openpgp from "openpgp";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("revoke", function () {
  this.timeout(60_000);

  it("returns a real revoked key (the previous impl wrote literal '[object Object]')", async function () {
    const key = await generate({
      name: "Revokee",
      email: "revokee@example.com",
      passphrase: "pp",
    });
    const result = await revoke({
      privateKey: { armored: key.privateKey, passphrase: "pp" },
      reason: { flag: 2, string: "compromised" },
    });

    expect(result.publicKey).to.match(/BEGIN PGP PUBLIC KEY BLOCK/);
    expect(result.privateKey).to.match(/BEGIN PGP PRIVATE KEY BLOCK/);

    const parsed = await openpgp.readKey({ armoredKey: result.publicKey });
    expect(await parsed.isRevoked()).to.equal(true);
  });
});
