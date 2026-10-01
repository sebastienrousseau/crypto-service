/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// RFC 9180 Appendix A known-answer tests. The vectors are a verbatim subset
// of the CFRG test-vectors.json; see the fixture's "source" field for the
// exact commit and SHA-256 of the file they were taken from.

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  hpkeOpen,
  hpkeSeal,
  hpkeSealWithEphemeral,
} from "../../src/modern/hpke";
import type { HpkeAead, HpkeKem } from "../../src/modern/hpke";

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      String(process.env.CRYPTO_KEY_DIR),
      "..",
      "vectors",
      "hpke-rfc9180.json",
    ),
    "utf8",
  ),
);

interface Vector {
  mode: number;
  kem_id: number;
  kdf_id: number;
  aead_id: number;
  info: string;
  skEm: string;
  pkEm: string;
  skRm: string;
  pkRm: string;
  enc: string;
  shared_secret: string;
  key: string;
  base_nonce: string;
  exporter_secret: string;
  psk?: string;
  psk_id?: string;
  encryption: { aad: string; ct: string; nonce: string; pt: string };
}

const KEMS: Record<number, HpkeKem> = { 0x0020: "x25519", 0x0010: "p256" };
const AEADS: Record<number, HpkeAead> = {
  0x0001: "aes-128-gcm",
  0x0003: "chacha20-poly1305",
};

function options(v: Vector) {
  const suite = { kem: KEMS[v.kem_id], aead: AEADS[v.aead_id] };
  const psk =
    v.mode === 1
      ? { psk: { psk: v.psk as string, pskId: v.psk_id as string } }
      : {};
  return { suite, info: v.info, aad: v.encryption.aad, ...psk };
}

describe("HPKE RFC 9180 test vectors", () => {
  const vectors = (fixture as { vectors: Vector[] }).vectors;

  it("covers every supported (mode, kem, kdf, aead) combination", () => {
    const combos = new Set(
      vectors.map((v) => [v.mode, v.kem_id, v.kdf_id, v.aead_id].join(",")),
    );
    expect(combos.size).to.equal(8);
  });

  for (const v of vectors) {
    const name = `mode ${v.mode}, kem 0x${v.kem_id.toString(16)}, aead 0x${v.aead_id.toString(16)}`;

    it(`setup and seal match the vector (${name})`, () => {
      const out = hpkeSealWithEphemeral(
        {
          recipientPublicKey: v.pkRm,
          plaintext: v.encryption.pt,
          ...options(v),
        },
        Buffer.from(v.skEm, "hex"),
      );
      expect(out.encapsulatedKey).to.equal(v.enc);
      expect(out.sharedSecret).to.equal(v.shared_secret);
      expect(out.key).to.equal(v.key);
      expect(out.baseNonce).to.equal(v.base_nonce);
      expect(out.exporterSecret).to.equal(v.exporter_secret);
      // Sequence number 0: the nonce is the base nonce.
      expect(v.encryption.nonce).to.equal(v.base_nonce);
      expect(out.ciphertext).to.equal(v.encryption.ct);
    });

    it(`opens the vector ciphertext (${name})`, () => {
      const opened = hpkeOpen({
        recipientPrivateKey: v.skRm,
        encapsulatedKey: v.enc,
        ciphertext: v.encryption.ct,
        ...options(v),
      });
      expect(opened.plaintext).to.equal(v.encryption.pt);
    });
  }

  it("rejects PSK mode with an empty psk or pskId (VerifyPSKInputs)", () => {
    const v = vectors[0];
    for (const psk of [
      { psk: "", pskId: "01" },
      { psk: "01", pskId: "" },
    ]) {
      expect(() =>
        hpkeSeal({ recipientPublicKey: v.pkRm, plaintext: "00", psk }),
      ).to.throw("PSK mode requires a non-empty psk and pskId");
      expect(() =>
        hpkeOpen({
          recipientPrivateKey: v.skRm,
          encapsulatedKey: v.enc,
          ciphertext: v.encryption.ct,
          psk,
        }),
      ).to.throw("PSK mode requires a non-empty psk and pskId");
    }
  });
});
