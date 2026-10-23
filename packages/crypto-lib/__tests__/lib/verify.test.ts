/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// verify wrapped its `message` in a new, unsigned OpenPGP message and
// verified that, so it never saw a signature: a clear-signed message, a
// message with a detached signature and text nobody signed all came back
// with zero signatures and no error, and /v1/verify answered 200. It now
// verifies a clear-signed message, or text with a detached `signature`,
// against every key given, returns `verified`, and refuses input that
// carries no signature.
import { expect } from "chai";
import * as openpgp from "openpgp";
import { sign } from "../../src/lib/sign";
import { verify } from "../../src/lib/verify";
import { _resetKeystoreForTests, loadKeystore } from "../../src/key/keystore";

const PASSPHRASE = "123456789abcdef";
const b64 = (armored: string) =>
  Buffer.from(armored, "latin1").toString("base64");

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a rejection");
}

describe("verify", function () {
  this.timeout(60000);
  let signerKey: string;
  let otherKey: string;

  // The verification key comes from the keystore sign() uses, read just
  // before each test, so the pair always matches.
  beforeEach(async () => {
    _resetKeystoreForTests();
    signerKey = b64((await loadKeystore()).publicKeyArmored);
  });

  before(async () => {
    const other = await openpgp.generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "Other", email: "other@example.com" }],
      format: "armored",
    });
    otherKey = b64(other.publicKey);
  });
  after(() => {
    _resetKeystoreForTests();
  });

  // OpenPGP refuses a signature created after the verification date, and
  // records creation times in whole seconds. Taking the date before an
  // awaited sign() (as `{ date: new Date(), message: await sign(...) }`
  // does) failed whenever signing crossed a second boundary: one run in
  // a few under load. The arguments, signatures included, are computed
  // before verifyNow takes the date.
  const verifyNow = (args: Omit<Parameters<typeof verify>[0], "date">) =>
    verify({ ...args, date: new Date() });

  const clearSigned = () =>
    sign({ message: "hello", detached: false, passphrase: PASSPHRASE });
  const detached = async () =>
    b64(
      await sign({ message: "hello", detached: true, passphrase: PASSPHRASE }),
    );

  it("verifies a clear-signed message", async () => {
    const res = await verifyNow({
      message: await clearSigned(),
      verificationKeys: signerKey,
    });
    expect(res.verified).to.equal(true);
    expect(res.data).to.equal("hello");
    expect(res.keyIDs).to.have.length(1);
    expect(res.keyIDs[0]).to.match(/^[0-9a-f]{16}$/);
  });

  it("verifies a detached signature", async () => {
    const res = await verifyNow({
      message: "hello",
      signature: await detached(),
      verificationKeys: signerKey,
    });
    expect(res).to.deep.include({ verified: true, data: "hello" });
  });

  it("rejects a clear-signed message whose text was changed", async () => {
    const tampered = (await clearSigned()).replace("hello", "hellO");
    const res = await verifyNow({
      message: tampered,
      verificationKeys: signerKey,
    });
    expect(res.verified).to.equal(false);
  });

  it("rejects a detached signature over different text", async () => {
    const res = await verifyNow({
      message: "goodbye",
      signature: await detached(),
      verificationKeys: signerKey,
    });
    expect(res.verified).to.equal(false);
  });

  it("rejects a signature by a key that was not given", async () => {
    const res = await verifyNow({
      message: await clearSigned(),
      verificationKeys: otherKey,
    });
    expect(res.verified).to.equal(false);
  });

  it("checks against every key given", async () => {
    const res = await verifyNow({
      message: await clearSigned(),
      verificationKeys: [otherKey, signerKey],
    });
    expect(res.verified).to.equal(true);
  });

  it("refuses text that carries no signature", async () => {
    const err = await rejection(
      verifyNow({
        message: "anything at all",
        verificationKeys: signerKey,
      }),
    );
    expect(err.message).to.match(/armored|cleartext|signed/i);
  });
});
