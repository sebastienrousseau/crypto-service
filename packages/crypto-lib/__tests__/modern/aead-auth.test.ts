/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * A failed tag check is the caller's error: a wrong key, wrong
 * associated data or a modified ciphertext. Each AEAD decryptor reports
 * it as CryptoError AUTH_FAILED, never as noble's plain Error, which a
 * server can only answer with a 500.
 */
import { expect } from "chai";
import {
  aeadDecrypt,
  aeadEncrypt,
  aesGcmDecrypt,
  aesGcmEncrypt,
  aesGcmSivDecrypt,
  aesGcmSivEncrypt,
} from "../../src/modern";
import {
  CryptoError,
  CryptoErrorCode,
  isCallerErrorCode,
} from "../../src/errors";

const KEY = "11".repeat(32);
const WRONG_KEY = "22".repeat(32);

/** Flip one bit in the last byte of a base64 ciphertext (the tag). */
function tamper(ciphertext: string): string {
  const bytes = Buffer.from(ciphertext, "base64");
  bytes[bytes.length - 1] ^= 1;
  return bytes.toString("base64");
}

const cases: Array<{
  name: string;
  encrypt: (o: { key: string; plaintext: string; aad?: Uint8Array }) => {
    ciphertext: string;
  };
  decrypt: (o: {
    key: string;
    ciphertext: string;
    aad?: Uint8Array;
  }) => Uint8Array;
}> = [
  { name: "aeadDecrypt", encrypt: aeadEncrypt, decrypt: aeadDecrypt },
  { name: "aesGcmDecrypt", encrypt: aesGcmEncrypt, decrypt: aesGcmDecrypt },
  {
    name: "aesGcmSivDecrypt",
    encrypt: aesGcmSivEncrypt,
    decrypt: aesGcmSivDecrypt,
  },
];

/** Assert `fn` throws a caller-error CryptoError with code AUTH_FAILED. */
function expectAuthFailed(fn: () => unknown): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).to.be.instanceOf(CryptoError);
  expect((thrown as CryptoError).code).to.equal(CryptoErrorCode.AUTH_FAILED);
  expect(isCallerErrorCode((thrown as CryptoError).code)).to.equal(true);
}

describe("AEAD decryption: failed authentication", () => {
  for (const { name, encrypt, decrypt } of cases) {
    describe(name, () => {
      const aad = new TextEncoder().encode("context");
      const { ciphertext } = encrypt({ key: KEY, plaintext: "secret", aad });

      it("still decrypts with the right key and associated data", () => {
        const plain = decrypt({ key: KEY, ciphertext, aad });
        expect(new TextDecoder().decode(plain)).to.equal("secret");
      });

      it("throws AUTH_FAILED for a wrong key", () => {
        expectAuthFailed(() => decrypt({ key: WRONG_KEY, ciphertext, aad }));
      });

      it("throws AUTH_FAILED for wrong associated data", () => {
        const other = new TextEncoder().encode("other");
        expectAuthFailed(() => decrypt({ key: KEY, ciphertext, aad: other }));
      });

      it("throws AUTH_FAILED for a modified ciphertext", () => {
        expectAuthFailed(() =>
          decrypt({ key: KEY, ciphertext: tamper(ciphertext), aad }),
        );
      });
    });
  }
});
