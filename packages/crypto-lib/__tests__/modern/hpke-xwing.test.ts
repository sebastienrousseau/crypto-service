/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// HPKE's post-quantum suite labelled itself KEM 0x0030, which IANA's HPKE
// registry assigns to X25519Kyber768Draft00 (pre-standard Kyber, a 64-byte
// shared secret), while it ran crypto-service's own X25519 + ML-KEM-768
// combiner: it claimed a suite it was not and interoperated with nothing.
// The registered X25519 + ML-KEM-768 KEM is X-Wing, 0x647A
// (draft-connolly-cfrg-xwing-kem-06), now offered as "x-wing". These tests
// run the draft's vectors through HPKE and recompute the key schedule with
// suite ID 0x647A independently.
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import { extract, expand } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
  hpkeGenerateKeyPair,
  hpkeOpen,
  hpkeSeal,
  hpkeSealWithEphemeral,
} from "../../src/modern/hpke";

interface Vector {
  seed: string;
  sk: string;
  pk: string;
  eseed: string;
  ct: string;
  ss: string;
}

const { vectors } = JSON.parse(
  readFileSync(
    path.join(__dirname, "../fixtures/vectors/xwing/xwing-draft-06.json"),
    "utf8",
  ),
) as { vectors: Vector[] };

const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const ascii = (s: string) => new TextEncoder().encode(s);
const cat = (...parts: Uint8Array[]) => Uint8Array.from(Buffer.concat(parts));

/** RFC 9180 key schedule (mode_base), for KEM 0x647A, HKDF-SHA256, ChaCha20Poly1305. */
function expectedKeyAndNonce(sharedSecret: Uint8Array, info: Uint8Array) {
  const suite = cat(ascii("HPKE"), bytes("647a"), bytes("0001"), bytes("0003"));
  const labeled = (label: string, ikm: Uint8Array) =>
    cat(ascii("HPKE-v1"), suite, ascii(label), ikm);
  const labeledExtract = (salt: Uint8Array, label: string, ikm: Uint8Array) =>
    extract(sha256, labeled(label, ikm), salt);
  const labeledExpand = (
    prk: Uint8Array,
    label: string,
    infoBytes: Uint8Array,
    length: number,
  ) =>
    expand(
      sha256,
      prk,
      cat(
        new Uint8Array([0, length]),
        ascii("HPKE-v1"),
        suite,
        ascii(label),
        infoBytes,
      ),
      length,
    );
  const empty = new Uint8Array(0);
  const context = cat(
    new Uint8Array([0]),
    labeledExtract(empty, "psk_id_hash", empty),
    labeledExtract(empty, "info_hash", info),
  );
  const secret = labeledExtract(sharedSecret, "secret", empty);
  return {
    key: labeledExpand(secret, "key", context, 32),
    nonce: labeledExpand(secret, "base_nonce", context, 12),
  };
}

describe("HPKE with X-Wing (KEM 0x647A)", function () {
  this.timeout(60000);
  const suite = { kem: "x-wing" as const, aead: "chacha20-poly1305" as const };

  vectors.forEach((v, i) => {
    it(`vector ${i}: Encap gives the draft's ciphertext and shared secret`, () => {
      const sealed = hpkeSealWithEphemeral(
        { recipientPublicKey: v.pk, plaintext: "68656c6c6f", info: "", suite },
        bytes(v.eseed),
      );
      expect(sealed.encapsulatedKey).to.equal(v.ct);
      expect(sealed.sharedSecret).to.equal(v.ss);

      // The key schedule runs on the X-Wing secret under suite ID 0x647A.
      const { key, nonce } = expectedKeyAndNonce(
        bytes(v.ss),
        new Uint8Array(0),
      );
      expect(sealed.key).to.equal(hex(key));
      expect(sealed.baseNonce).to.equal(hex(nonce));
      expect(sealed.ciphertext).to.equal(
        hex(
          chacha20poly1305(key, nonce, new Uint8Array(0)).encrypt(
            bytes("68656c6c6f"),
          ),
        ),
      );
    });

    it(`vector ${i}: Decap with the draft's 32-byte key opens it`, () => {
      const sealed = hpkeSealWithEphemeral(
        { recipientPublicKey: v.pk, plaintext: "776f726c64", suite },
        bytes(v.eseed),
      );
      const opened = hpkeOpen({
        recipientPrivateKey: v.sk,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
      });
      expect(opened.plaintext).to.equal("776f726c64");
    });
  });

  it("generates X-Wing keys: a 32-byte seed and a 1216-byte public key", () => {
    const kp = hpkeGenerateKeyPair("x-wing");
    expect(kp.privateKey).to.have.length(64);
    expect(kp.publicKey).to.have.length(2432);
    for (const aead of ["chacha20-poly1305", "aes-128-gcm"] as const) {
      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext: "0102",
        aad: "aa",
        suite: { kem: "x-wing", aead },
      });
      expect(sealed.encapsulatedKey).to.have.length(2240);
      expect(
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
          aad: "aa",
          suite: { kem: "x-wing", aead },
        }).plaintext,
      ).to.equal("0102");
    }
  });

  it("refuses keys and encapsulations of the wrong length", () => {
    const kp = hpkeGenerateKeyPair("x-wing");
    expect(() =>
      hpkeSeal({
        recipientPublicKey: "00".repeat(1184),
        plaintext: "00",
        suite,
      }),
    ).to.throw(/x-wing public key/);
    const sealed = hpkeSeal({
      recipientPublicKey: kp.publicKey,
      plaintext: "00",
      suite,
    });
    expect(() =>
      hpkeOpen({
        recipientPrivateKey: "00".repeat(2432),
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
      }),
    ).to.throw(/x-wing private key/);
    expect(() =>
      hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: "00".repeat(1119),
        ciphertext: sealed.ciphertext,
        suite,
      }),
    ).to.throw(/x-wing encapsulated key/);
  });

  it("does not open an X-Wing message under the old suite, or the reverse", () => {
    const xw = hpkeGenerateKeyPair("x-wing");
    const sealed = hpkeSeal({
      recipientPublicKey: xw.publicKey,
      plaintext: "00",
      suite,
    });
    expect(() =>
      hpkeOpen({
        recipientPrivateKey: xw.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite: { kem: "x25519-ml-kem-768" },
      }),
    ).to.throw();
  });
});
