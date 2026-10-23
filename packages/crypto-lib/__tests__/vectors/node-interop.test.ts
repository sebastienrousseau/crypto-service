/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Interoperability with Node.js's own crypto (OpenSSL): what crypto-lib
// signs, Node verifies, and the reverse; key agreement yields the same
// secret on both sides; AES-GCM ciphertexts open on either. crypto-lib's
// tests only ever checked crypto-lib against itself, which is how its
// ECDSA verifier came to refuse half of OpenSSL's signatures.
import { expect } from "chai";
import * as node from "crypto";
import { crypto } from "../../src/crypto";
import { aesGcmDecrypt, aesGcmEncrypt } from "../../src/modern/aes";
import {
  ecdhP256,
  ecdhP384,
  generateEd448KeyPair,
  generateP256KeyPair,
  generateP384KeyPair,
  x448Exchange,
  generateX448KeyPair,
} from "../../src/modern/curves";
import { generateX25519KeyPair, x25519Exchange } from "../../src/modern/ecdh";
import { generateEd25519KeyPair } from "../../src/modern/signing";

const b64u = (hex: string) => Buffer.from(hex, "hex").toString("base64url");
const hexOf = (b64url: string) =>
  Buffer.from(b64url, "base64url").toString("hex");

/** Node key objects for a crypto-lib OKP key pair (Ed25519, Ed448, X25519, X448). */
function okp(crv: string, pub: string, priv?: string) {
  const jwk = {
    kty: "OKP",
    crv,
    x: b64u(pub),
    ...(priv ? { d: b64u(priv) } : {}),
  };
  return priv
    ? node.createPrivateKey({ key: jwk, format: "jwk" })
    : node.createPublicKey({ key: jwk, format: "jwk" });
}

/** Node key objects for a crypto-lib EC key pair (uncompressed public key). */
function ec(crv: string, pub: string, priv?: string) {
  const size = (pub.length - 2) / 4;
  const jwk = {
    kty: "EC",
    crv,
    x: b64u(pub.slice(2, 2 + 2 * size)),
    y: b64u(pub.slice(2 + 2 * size)),
    ...(priv ? { d: b64u(priv) } : {}),
  };
  return priv
    ? node.createPrivateKey({ key: jwk, format: "jwk" })
    : node.createPublicKey({ key: jwk, format: "jwk" });
}

/** A Node key pair's public key in crypto-lib's form. */
function nodePublic(kind: "okp" | "ec", key: node.KeyObject): string {
  const jwk = key.export({ format: "jwk" });
  return kind === "okp" ? hexOf(jwk.x!) : `04${hexOf(jwk.x!)}${hexOf(jwk.y!)}`;
}

/** crypto-lib key generation for each signature algorithm. */
const GENERATORS = {
  ed25519: generateEd25519KeyPair,
  ed448: generateEd448KeyPair,
  "ecdsa-p256": generateP256KeyPair,
  "ecdsa-p384": generateP384KeyPair,
};

const MESSAGES = Array.from({ length: 40 }, (_, i) =>
  Buffer.from(`message ${i}`),
);

describe("interoperability with Node.js crypto", function () {
  this.timeout(60000);

  for (const [algorithm, kind, crv, hash, options] of [
    ["ed25519", "okp", "Ed25519", null, {}],
    ["ed448", "okp", "Ed448", null, {}],
    [
      "ecdsa-p256",
      "ec",
      "P-256",
      "sha256",
      { dsaEncoding: "ieee-p1363" as const },
    ],
    [
      "ecdsa-p384",
      "ec",
      "P-384",
      "sha384",
      { dsaEncoding: "ieee-p1363" as const },
    ],
  ] as const) {
    it(`${algorithm}: Node verifies crypto-lib, crypto-lib verifies Node`, () => {
      const kp = GENERATORS[algorithm]();
      const toNode = kind === "okp" ? okp : ec;
      const priv = toNode(crv, kp.publicKey, kp.privateKey);
      const pub = toNode(crv, kp.publicKey);
      for (const msg of MESSAGES) {
        const ours = Buffer.from(
          crypto.sign(algorithm, kp.privateKey, msg),
          "hex",
        );
        expect(node.verify(hash, msg, { key: pub, ...options }, ours)).to.equal(
          true,
        );
        const theirs = node
          .sign(hash, msg, { key: priv, ...options })
          .toString("hex");
        expect(
          crypto.verify(algorithm, kp.publicKey, msg, theirs),
          msg.toString(),
        ).to.equal(true);
      }
    });
  }

  for (const [name, generate, exchange, kind, crv] of [
    ["X25519", generateX25519KeyPair, x25519Exchange, "okp", "X25519"],
    ["X448", generateX448KeyPair, x448Exchange, "okp", "X448"],
    ["ECDH P-256", generateP256KeyPair, ecdhP256, "ec", "P-256"],
    ["ECDH P-384", generateP384KeyPair, ecdhP384, "ec", "P-384"],
  ] as const) {
    it(`${name}: both sides derive Node's shared secret`, () => {
      const ours = (
        generate as () => { publicKey: string; privateKey: string }
      )();
      const theirs =
        kind === "okp"
          ? node.generateKeyPairSync(crv.toLowerCase() as "x25519")
          : node.generateKeyPairSync("ec", { namedCurve: crv });
      const expected = node
        .diffieHellman({
          privateKey: theirs.privateKey,
          publicKey: (kind === "okp" ? okp : ec)(crv, ours.publicKey),
        })
        .toString("hex");
      const derived = (
        exchange as (a: string, b: string) => { sharedSecret: string }
      )(ours.privateKey, nodePublic(kind, theirs.publicKey));
      expect(derived.sharedSecret).to.equal(expected);
    });
  }

  for (const bits of [128, 256]) {
    it(`AES-${bits}-GCM ciphertexts open on either side`, () => {
      const key = node.randomBytes(bits / 8);
      const aad = Buffer.from("header");
      const sealed = Buffer.from(
        aesGcmEncrypt({ key, plaintext: "from crypto-lib", aad }).ciphertext,
        "base64",
      );
      const decipher = node.createDecipheriv(
        `aes-${bits}-gcm`,
        key,
        sealed.subarray(0, 12),
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(sealed.subarray(-16));
      const opened = Buffer.concat([
        decipher.update(sealed.subarray(12, -16)),
        decipher.final(),
      ]);
      expect(opened.toString()).to.equal("from crypto-lib");

      const iv = node.randomBytes(12);
      const cipher = node.createCipheriv(`aes-${bits}-gcm`, key, iv);
      cipher.setAAD(aad);
      const ct = Buffer.concat([cipher.update("from Node"), cipher.final()]);
      const ours = aesGcmDecrypt({
        key,
        ciphertext: Buffer.concat([iv, ct, cipher.getAuthTag()]).toString(
          "base64",
        ),
        aad,
      });
      expect(Buffer.from(ours).toString()).to.equal("from Node");
    });
  }
});
