/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// About twenty modules each parsed hex with their own copy of
// /^[0-9a-fA-F]*$/ and Buffer.from(hex, "hex"), which drops a trailing odd
// nibble: an HKDF salt of "abc" was used as "ab" (and reported as "ab"),
// and a 33-digit HMAC key became 16 bytes and passed the length check.
// Three modules did not check at all, so "zz" became an empty key. Every
// hex input now goes through one strict check: hex digits, even length.
import { expect } from "chai";
import { kdfDerive } from "../src/modern/kdf";
import { computeHmac } from "../src/modern/mac";
import { ed25519Sign } from "../src/modern/signing";
import { x25519Exchange } from "../src/modern/ecdh";
import { aeadEncrypt } from "../src/modern/aead";
import { CryptoError } from "../src/errors";

/** The error `fn` throws. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

/** Expects `fn` to fail as invalid hex. */
function refusesHex(fn: () => unknown): void {
  const err = thrown(fn);
  expect(err, "should throw").to.be.instanceOf(CryptoError);
  expect((err as CryptoError).code).to.equal("INVALID_HEX");
}

describe("hex inputs are strict", () => {
  it("refuses an odd-length HKDF salt instead of dropping a nibble", () => {
    refusesHex(() =>
      kdfDerive({
        algorithm: "hkdf-sha256",
        password: "secret",
        salt: "abc",
        keyLength: 16,
      } as never),
    );
  });

  it("refuses an odd-length HMAC key", () => {
    refusesHex(() =>
      computeHmac({ algorithm: "sha256", key: "a".repeat(33), data: "x" }),
    );
  });

  it("refuses an odd-length AEAD key", () => {
    refusesHex(() => aeadEncrypt({ key: "a".repeat(63), plaintext: "x" }));
  });

  it("refuses non-hex Ed25519 and X25519 keys", () => {
    refusesHex(() => ed25519Sign("zz".repeat(32), "message"));
    refusesHex(() => x25519Exchange("zz".repeat(32), "aa".repeat(32)));
  });
});
