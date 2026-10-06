/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Official standards regression test vectors from RFC 8439, RFC 5869, and
// NIST SP 800-38D verifying strict conformance against published CAVP/KAT vectors.

import { expect } from "chai";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { gcm } from "@noble/ciphers/aes.js";
import { kdfDerive } from "../../src/modern/kdf";
import { aesGcmDecrypt } from "../../src/modern/aes";

describe("Official Standards Cryptographic Regression Tests", () => {
  describe("RFC 8439: ChaCha20-Poly1305 AEAD (Section 2.8.2)", () => {
    const key = Buffer.from(
      "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f",
      "hex",
    );
    const nonce = Buffer.from("070000004041424344454647", "hex");
    const aad = Buffer.from("50515253c0c1c2c3c4c5c6c7", "hex");
    const plaintext =
      "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.";
    const ptBytes = Buffer.from(plaintext, "utf8");

    const expectedCiphertext =
      "d31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc3ff4def08e4b7a9de576d26586cec64b6116";
    const expectedTag = "1ae10b594f09e26a7e902ecbd0600691";

    it("encrypts plaintext to exact RFC 8439 ciphertext and auth tag", () => {
      const cipher = chacha20poly1305(key, nonce, aad);
      const sealed = cipher.encrypt(ptBytes);

      const ct = sealed.subarray(0, sealed.length - 16);
      const tag = sealed.subarray(sealed.length - 16);

      expect(Buffer.from(ct).toString("hex")).to.equal(expectedCiphertext);
      expect(Buffer.from(tag).toString("hex")).to.equal(expectedTag);
    });

    it("decrypts the official RFC 8439 ciphertext to original plaintext", () => {
      const cipher = chacha20poly1305(key, nonce, aad);
      const sealed = Buffer.concat([
        Buffer.from(expectedCiphertext, "hex"),
        Buffer.from(expectedTag, "hex"),
      ]);

      const decrypted = cipher.decrypt(sealed);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal(plaintext);
    });
  });

  describe("RFC 5869: HKDF-SHA256 Test Vectors", () => {
    it("conforms to Test Case 1 (L=42)", () => {
      const ikm = Buffer.from("0b".repeat(22), "hex");
      const salt = "000102030405060708090a0b0c";
      const info = Buffer.from("f0f1f2f3f4f5f6f7f8f9", "hex");

      const res = kdfDerive({
        algorithm: "hkdf-sha256",
        password: ikm,
        salt,
        keyLength: 42,
        params: { info },
      });

      const expectedOkm =
        "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865";
      expect(res.derivedKey).to.equal(expectedOkm);
    });

    it("conforms to Test Case 2 (L=82)", () => {
      const ikm = Buffer.from(Array.from({ length: 80 }, (_, i) => i));
      const salt = Buffer.from(
        Array.from({ length: 80 }, (_, i) => i + 0x60),
      ).toString("hex");
      const info = Buffer.from(Array.from({ length: 80 }, (_, i) => i + 0xb0));

      const res = kdfDerive({
        algorithm: "hkdf-sha256",
        password: ikm,
        salt,
        keyLength: 82,
        params: { info },
      });

      const expectedOkm =
        "b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87";
      expect(res.derivedKey).to.equal(expectedOkm);
    });
  });

  describe("NIST SP 800-38D: AES-256-GCM Test Vector", () => {
    it("conforms to NIST zero-length plaintext KAT with 96-bit IV", () => {
      const key =
        "0000000000000000000000000000000000000000000000000000000000000000";
      const iv = "000000000000000000000000";
      const expectedTag = "530f8afbc74536b9a963b4f1c4cb738b";

      const cipher = gcm(Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
      const sealed = cipher.encrypt(new Uint8Array(0));
      expect(Buffer.from(sealed).toString("hex")).to.equal(expectedTag);

      // Verify unpack and decrypt via aesGcmDecrypt format: base64(iv || ct || tag)
      const packed = Buffer.concat([
        Buffer.from(iv, "hex"),
        Buffer.from(expectedTag, "hex"),
      ]).toString("base64");

      const decrypted = aesGcmDecrypt({
        key,
        ciphertext: packed,
      });
      expect(decrypted.length).to.equal(0);
    });
  });
});
