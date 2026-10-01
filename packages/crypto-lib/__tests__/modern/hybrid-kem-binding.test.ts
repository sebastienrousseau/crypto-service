/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Hybrid KEM combiner binding: the derived secret must commit to both
 * component ciphertexts and both recipient public keys, and the hybrids must
 * not be presented as the RFC 10024 TLS groups they do not implement.
 */
import { expect } from "chai";
import {
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
  p256MlKemKeygen,
  p256MlKemEncapsulate,
  p256MlKemDecapsulate,
  x448MlKemKeygen,
  x448MlKemEncapsulate,
  mlKemDecapsulate,
  normalizeHybridKemAlgorithm,
  RFC10024_X25519_MLKEM768,
  RFC10024_SECP256R1_MLKEM768,
  RFC10024_CODEPOINTS,
  type MlKemLevel,
} from "../../src/modern/pq-kem";
import { x25519 } from "@noble/curves/ed25519.js";
import { x448 } from "@noble/curves/ed448.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

const hex = (h: string) => Buffer.from(h, "hex");

/** 4-byte big-endian length prefix followed by the bytes. */
function lp(bytes: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

/** Independent re-derivation of the documented v2 combiner. */
function expectedSecret(
  alg: string,
  ssClassical: Uint8Array,
  ssMlKem: Uint8Array,
  ctClassical: Uint8Array,
  pkClassical: Uint8Array,
  ctMlKem: Uint8Array,
  pkMlKem: Uint8Array,
): string {
  const info = Buffer.concat([
    lp(Buffer.from(`crypto-service/hybrid-kem/v2/${alg}`, "utf8")),
    lp(ctClassical),
    lp(pkClassical),
    lp(ctMlKem),
    lp(pkMlKem),
  ]);
  const ikm = Buffer.concat([ssClassical, ssMlKem]);
  return Buffer.from(hkdf(sha256, ikm, undefined, info, 32)).toString("hex");
}

/** The unbound pre-v0.0.7 derivation: HKDF(ss_classical || ss_mlkem). */
function legacySecret(
  label: string,
  ssClassical: Uint8Array,
  ssMlKem: Uint8Array,
): string {
  const ikm = Buffer.concat([ssClassical, ssMlKem]);
  const info = Buffer.from(label, "utf8");
  return Buffer.from(hkdf(sha256, ikm, undefined, info, 32)).toString("hex");
}

describe("Hybrid KEM combiner binding", function () {
  this.timeout(30000);

  for (const level of [512, 768, 1024] as MlKemLevel[]) {
    it(`x25519-ml-kem-${level} binds ciphertexts and public keys`, () => {
      const kp = hybridKemKeygen(level);
      const enc = hybridKemEncapsulate(
        level,
        kp.x25519PublicKey,
        kp.mlKemPublicKey,
      );
      const ssX = x25519.getSharedSecret(
        hex(kp.x25519PrivateKey),
        hex(enc.x25519EphemeralPublic),
      );
      const ssM = hex(
        mlKemDecapsulate(level, kp.mlKemSecretKey, enc.mlKemCiphertext)
          .sharedSecret,
      );
      const want = expectedSecret(
        `x25519-ml-kem-${level}`,
        ssX,
        ssM,
        hex(enc.x25519EphemeralPublic),
        hex(kp.x25519PublicKey),
        hex(enc.mlKemCiphertext),
        hex(kp.mlKemPublicKey),
      );
      expect(enc.sharedSecret).to.equal(want);
      expect(enc.sharedSecret).to.not.equal(
        legacySecret(`x25519-ml-kem-${level}-hybrid`, ssX, ssM),
      );
      const dec = hybridKemDecapsulate(
        level,
        kp.x25519PrivateKey,
        kp.mlKemSecretKey,
        enc.x25519EphemeralPublic,
        enc.mlKemCiphertext,
      );
      expect(dec.sharedSecret).to.equal(want);
    });
  }

  it("p256-ml-kem-768 binds ciphertexts and public keys", () => {
    const kp = p256MlKemKeygen();
    const enc = p256MlKemEncapsulate(kp.p256PublicKey, kp.mlKemPublicKey);
    const ssC = p256.getSharedSecret(
      hex(kp.p256PrivateKey),
      hex(enc.p256EphemeralPublic),
    );
    const ssM = hex(
      mlKemDecapsulate(768, kp.mlKemSecretKey, enc.mlKemCiphertext)
        .sharedSecret,
    );
    expect(enc.sharedSecret).to.equal(
      expectedSecret(
        "p256-ml-kem-768",
        ssC,
        ssM,
        hex(enc.p256EphemeralPublic),
        hex(kp.p256PublicKey),
        hex(enc.mlKemCiphertext),
        hex(kp.mlKemPublicKey),
      ),
    );
  });

  it("p256-ml-kem-768 accepts a compressed recipient key and binds it uncompressed", () => {
    const kp = p256MlKemKeygen();
    const compressed = p256.Point.fromBytes(hex(kp.p256PublicKey)).toHex(true);
    const enc = p256MlKemEncapsulate(compressed, kp.mlKemPublicKey);
    const dec = p256MlKemDecapsulate(
      kp.p256PrivateKey,
      kp.mlKemSecretKey,
      enc.p256EphemeralPublic,
      enc.mlKemCiphertext,
    );
    expect(dec.sharedSecret).to.equal(enc.sharedSecret);
  });

  it("x448-ml-kem-1024 binds ciphertexts and public keys", () => {
    const kp = x448MlKemKeygen();
    const enc = x448MlKemEncapsulate(kp.x448PublicKey, kp.mlKemPublicKey);
    const ssC = x448.getSharedSecret(
      hex(kp.x448PrivateKey),
      hex(enc.x448EphemeralPublic),
    );
    const ssM = hex(
      mlKemDecapsulate(1024, kp.mlKemSecretKey, enc.mlKemCiphertext)
        .sharedSecret,
    );
    expect(enc.sharedSecret).to.equal(
      expectedSecret(
        "x448-ml-kem-1024",
        ssC,
        ssM,
        hex(enc.x448EphemeralPublic),
        hex(kp.x448PublicKey),
        hex(enc.mlKemCiphertext),
        hex(kp.mlKemPublicKey),
      ),
    );
  });

  it("decapsulating under a different X25519 key pair gives a different secret", () => {
    // The recipient public key is derived from the private key and bound,
    // so a secret is tied to the exact recipient key pair.
    const kp = hybridKemKeygen(768);
    const enc = hybridKemEncapsulate(
      768,
      kp.x25519PublicKey,
      kp.mlKemPublicKey,
    );
    const other = hybridKemKeygen(768);
    const dec = hybridKemDecapsulate(
      768,
      other.x25519PrivateKey,
      kp.mlKemSecretKey,
      enc.x25519EphemeralPublic,
      enc.mlKemCiphertext,
    );
    expect(dec.sharedSecret).to.not.equal(enc.sharedSecret);
  });

  describe("RFC 10024 TLS group identifiers", () => {
    it("records the IANA TLS Supported Groups codepoints", () => {
      // IANA TLS Supported Groups: 4587 SecP256r1MLKEM768, 4588 X25519MLKEM768.
      expect(RFC10024_CODEPOINTS[RFC10024_X25519_MLKEM768]).to.equal(0x11ec);
      expect(RFC10024_CODEPOINTS[RFC10024_SECP256R1_MLKEM768]).to.equal(0x11eb);
    });

    it("does not map the TLS group names onto this library's hybrids", () => {
      expect(() =>
        normalizeHybridKemAlgorithm(RFC10024_X25519_MLKEM768),
      ).to.throw(/not implemented/);
      expect(() =>
        normalizeHybridKemAlgorithm(RFC10024_SECP256R1_MLKEM768),
      ).to.throw(/not implemented/);
    });
  });
});
