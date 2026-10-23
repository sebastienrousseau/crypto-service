/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The `pgp` namespace (and the `./pgp` subpath) wraps the OpenPGP
// operations in lib/. This file held a placeholder that asserted `true`,
// so no test called the wrappers, and coverage, which counts every
// source file, never saw them. Each one now runs once, with the
// synthetic keystore in __tests__/fixtures/keys.
import { expect } from "chai";
import { pgp } from "../src";

const PASSPHRASE = "123456789abcdef";
const b64 = (armored: string) =>
  Buffer.from(armored, "latin1").toString("base64");
const person = { name: "Jane Doe", email: "jane@doe.com" };

describe("pgp namespace", function () {
  this.timeout(60000);
  let publicKey: string;
  let privateKey: string;

  before(async () => {
    const keystore = await pgp.loadKeystore();
    publicKey = b64(keystore.publicKeyArmored);
    privateKey = b64(keystore.privateKeyArmored);
  });

  it("encrypts, signs and decrypts a message", async () => {
    const encrypted = await pgp.encrypt({
      passphrase: PASSPHRASE,
      message: "hello",
      publicKey,
      privateKey,
    });
    const decrypted = await pgp.decrypt({
      passphrase: PASSPHRASE,
      message: b64(encrypted),
      publicKey,
      privateKey,
    });
    expect(decrypted).to.deep.equal({ data: "hello", signatureValid: true });
  });

  it("signs and verifies a message", async () => {
    const signed = await pgp.sign({
      message: "hello",
      detached: false,
      passphrase: PASSPHRASE,
    });
    const result = await pgp.verify({
      date: new Date(),
      message: signed,
      verificationKeys: publicKey,
    });
    expect(result.verified).to.equal(true);
  });

  it("generates a key pair without writing it", async () => {
    const keys = (await pgp.generate(
      {
        ...person,
        userIDs: [person],
        type: "ecc",
        curve: "ed25519",
        format: "armored",
        passphrase: PASSPHRASE,
        rsaBits: 2048,
        keyExpirationTime: 0,
        date: new Date(),
      },
      { persist: false },
    )) as { publicKey: string };
    expect(keys.publicKey).to.include("BEGIN PGP PUBLIC KEY BLOCK");
  });

  it("generates a session key for a recipient", async () => {
    const session = await pgp.session({ ...person, publicKey });
    expect(session.data).to.be.instanceOf(Uint8Array);
    expect(session.algorithm).to.be.a("string");
  });

  it("revokes and reformats the keystore key without writing it", async () => {
    const revoked = await pgp.revoke(
      { passphrase: PASSPHRASE, flag: 0, reason: "test" },
      { persist: false },
    );
    expect(revoked.publicKey).to.include("BEGIN PGP PUBLIC KEY BLOCK");
    const reformatted = await pgp.reformat(
      {
        ...person,
        date: new Date(),
        expiration: 0,
        passphrase: PASSPHRASE,
        publicKey,
      },
      { persist: false },
    );
    expect(reformatted.publicKey).to.include("BEGIN PGP PUBLIC KEY BLOCK");
  });
});
