/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The curve option of `generate` (`dataGenerate.curve`) offers every
// curve in enums.ts, but OpenPGP.js's Node build needs the `eckey-utils`
// module for secp256k1 and the Brainpool curves and does not declare it,
// so generating, signing with or verifying those keys failed with
// "Cannot find module 'eckey-utils'". crypto-lib now depends on it.
// secp256k1 stays refused: OpenPGP.js v6 rejects it by default.
import { expect } from "chai";
import * as openpgp from "openpgp";
import enums from "../../src/enums";
import { generate } from "../../src/lib/generate";

const curves = [...new Set(Object.values(enums.curve))];

function generateEcc(curve: string) {
  return generate(
    {
      type: "ecc",
      curve: curve as keyof typeof enums.curve,
      format: "armored",
      name: "Jane Doe",
      email: "jane@doe.com",
      passphrase: "",
      keyExpirationTime: 0,
      rsaBits: 2048,
      date: new Date(),
      userIDs: [{ name: "Jane Doe", email: "jane@doe.com" }],
    },
    { persist: false },
  ) as Promise<{ privateKey: string; publicKey: string }>;
}

describe("ECC curves offered by generate", function () {
  this.timeout(60000);

  for (const curve of curves.filter((c) => c !== "secp256k1")) {
    it(`generates, signs and verifies with ${curve}`, async () => {
      const { privateKey, publicKey } = await generateEcc(curve);
      const signingKey = await openpgp.readPrivateKey({
        armoredKey: privateKey,
      });
      const message = await openpgp.createMessage({ text: "hello" });
      const signature = await openpgp.sign({
        message,
        signingKeys: signingKey,
        detached: true,
      });
      const { signatures } = await openpgp.verify({
        message,
        signature: await openpgp.readSignature({ armoredSignature: signature }),
        verificationKeys: await openpgp.readKey({ armoredKey: publicKey }),
      });
      expect(await signatures[0]!.verified).to.equal(true);
    });
  }

  it("refuses secp256k1, which OpenPGP.js disables by default", async () => {
    let error: unknown;
    try {
      await generateEcc("secp256k1");
    } catch (e) {
      error = e;
    }
    expect(String(error)).to.match(/secp256k1 is disabled/);
  });

  it("maps every alias to a canonical curve name", () => {
    expect(curves).to.have.members([
      "p256",
      "p384",
      "p521",
      "secp256k1",
      "ed25519",
      "curve25519",
      "brainpoolP256r1",
      "brainpoolP384r1",
      "brainpoolP512r1",
    ]);
  });
});
