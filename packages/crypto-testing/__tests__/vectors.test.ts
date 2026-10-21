// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import crypto from "node:crypto";
import { hash } from "@sebastienrousseau/crypto-lib/modern";
import { RFC_VECTORS, TEST_KEYS, TEST_VECTORS } from "../src/keys";

// Every published key pair and expected value is recomputed with an
// independent implementation (node:crypto, or crypto-lib for BLAKE3).
// Checking only lengths let wrong digests, a wrong Ed25519 public key, a
// made-up P-256 public key and a mistyped HKDF PRK ship as "known
// answers".

const H = (hex: string) => Buffer.from(hex, "hex");

/** Raw Ed25519/X25519 public key for a raw private key, via PKCS#8. */
function okpPublicKey(type: "ed25519" | "x25519", priv: string): string {
  const prefix =
    type === "ed25519"
      ? "302e020100300506032b657004220420"
      : "302e020100300506032b656e04220420";
  const key = crypto.createPrivateKey({
    key: Buffer.concat([H(prefix), H(priv)]),
    format: "der",
    type: "pkcs8",
  });
  const spki = crypto
    .createPublicKey(key)
    .export({ format: "der", type: "spki" });
  return spki.subarray(spki.length - 32).toString("hex");
}

describe("published vectors are correct", () => {
  it("TEST_KEYS.ed25519 is a matching RFC 8032 key pair", () => {
    expect(okpPublicKey("ed25519", TEST_KEYS.ed25519.privateKey)).to.equal(
      TEST_KEYS.ed25519.publicKey,
    );
  });

  it("TEST_KEYS.x25519 is a matching RFC 7748 key pair", () => {
    expect(okpPublicKey("x25519", TEST_KEYS.x25519.privateKey)).to.equal(
      TEST_KEYS.x25519.publicKey,
    );
  });

  it("TEST_KEYS.p256 is a matching uncompressed key pair", () => {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(H(TEST_KEYS.p256.privateKey));
    expect(ecdh.getPublicKey("hex", "uncompressed")).to.equal(
      TEST_KEYS.p256.publicKey,
    );
  });

  it("TEST_VECTORS digests match the plaintext", () => {
    const m = TEST_VECTORS.plaintext;
    expect(crypto.createHash("sha256").update(m).digest("hex")).to.equal(
      TEST_VECTORS.sha256,
    );
    expect(crypto.createHash("sha3-256").update(m).digest("hex")).to.equal(
      TEST_VECTORS.sha3_256,
    );
    expect(hash({ data: m, algorithm: "blake3" }).digest).to.equal(
      TEST_VECTORS.blake3,
    );
  });

  it("RFC 8439 ChaCha20-Poly1305 vector encrypts as published", () => {
    const v = RFC_VECTORS.rfc8439_chacha20_poly1305;
    const pt = Buffer.from(v.plaintext, "utf8");
    const c = crypto.createCipheriv("chacha20-poly1305", H(v.key), H(v.nonce), {
      authTagLength: 16,
    });
    c.setAAD(H(v.aad), { plaintextLength: pt.length });
    const ct = Buffer.concat([c.update(pt), c.final()]);
    expect(ct.toString("hex")).to.equal(v.ciphertext);
    expect(c.getAuthTag().toString("hex")).to.equal(v.tag);
  });

  it("RFC 5869 HKDF-SHA256 vector derives the published PRK and OKM", () => {
    const v = RFC_VECTORS.rfc5869_hkdf_sha256;
    const prk = crypto
      .createHmac("sha256", H(v.salt))
      .update(H(v.ikm))
      .digest("hex");
    expect(prk).to.equal(v.prk);
    const okm = Buffer.from(
      crypto.hkdfSync("sha256", H(v.ikm), H(v.salt), H(v.info), v.l),
    );
    expect(okm.toString("hex")).to.equal(v.okm);
  });

  it("NIST AES-256-GCM vector produces the published tag", () => {
    const v = RFC_VECTORS.nist_aes256_gcm;
    const c = crypto.createCipheriv("aes-256-gcm", H(v.key), H(v.iv));
    c.setAAD(H(v.aad));
    const ct = Buffer.concat([c.update(H(v.plaintext)), c.final()]);
    expect(ct.toString("hex")).to.equal(v.ciphertext);
    expect(c.getAuthTag().toString("hex")).to.equal(v.tag);
  });
});
