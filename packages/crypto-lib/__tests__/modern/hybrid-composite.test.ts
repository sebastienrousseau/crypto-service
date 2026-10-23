/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// hybridSign had Ed25519 and ML-DSA each sign the raw message, so either
// half was an ordinary signature on its own: it could be stripped from the
// hybrid and passed off as a single-algorithm signature, and nothing bound
// the pair together. Both halves now sign the domain-separated message
// representative of Composite ML-DSA (draft-ietf-lamps-pq-composite-sigs-19,
// section 2.2), M' = Prefix || Label || len(ctx) || ctx || SHA-512(M), the
// ML-DSA half with the Label as its context. These tests use the draft's
// own vectors.
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import { ed25519 } from "@noble/curves/ed25519.js";
import { ml_dsa44, ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import {
  hybridSign,
  hybridVerify,
  mlDsaKeygen,
  mlDsaSign,
  mlDsaVerify,
} from "../../src/modern/pq-sign";
import { ed25519Verify } from "../../src/modern/signing";

interface Vector {
  tcId: string;
  pk: string;
  sk: string;
  s: string;
  sWithContext: string;
}

const fixture = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "../fixtures/vectors/composite-sigs/mldsa-ed25519-draft-19.json",
    ),
    "utf8",
  ),
) as { m: string; ctx: string; tests: Vector[] };

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const message = b64(fixture.m);
const context = b64(fixture.ctx);

/** The vector's keys and signatures, split into their two components. */
function parts(v: Vector) {
  const level = v.tcId.includes("MLDSA44") ? 44 : 65;
  const pk = b64(v.pk);
  const split = (sig: Uint8Array) => ({
    mlDsa: hex(sig.subarray(0, sig.length - 64)),
    ed25519: hex(sig.subarray(sig.length - 64)),
  });
  return {
    level: level as 44 | 65,
    mlDsaPub: hex(pk.subarray(0, pk.length - 32)),
    edPub: hex(pk.subarray(pk.length - 32)),
    s: split(b64(v.s)),
    sWithContext: split(b64(v.sWithContext)),
    seed: b64(v.sk).subarray(0, 32),
    edSecret: hex(b64(v.sk).subarray(32)),
  };
}

describe("hybrid signatures as Composite ML-DSA (draft 19)", function () {
  this.timeout(60000);

  for (const v of fixture.tests) {
    describe(v.tcId, () => {
      const p = parts(v);

      it("verifies the draft's signature, with and without a context", () => {
        const verify = (
          sig: { mlDsa: string; ed25519: string },
          ctx?: Uint8Array,
        ) =>
          hybridVerify(
            p.edPub,
            p.mlDsaPub,
            message,
            sig.ed25519,
            sig.mlDsa,
            p.level,
            ctx ? { context: ctx } : {},
          ).valid;
        expect(verify(p.s)).to.equal(true);
        expect(verify(p.sWithContext, context)).to.equal(true);
        expect(verify(p.sWithContext)).to.equal(false);
        expect(verify(p.s, context)).to.equal(false);
      });

      it("signs with the draft's private key so its public key verifies", () => {
        const dsa = p.level === 44 ? ml_dsa44 : ml_dsa65;
        const mlDsaSecret = hex(dsa.keygen(p.seed).secretKey);
        const signed = hybridSign(p.edSecret, mlDsaSecret, message, p.level, {
          context,
        });
        expect(signed.algorithm).to.equal(`ed25519-ml-dsa-${p.level}`);
        expect(signed.signature).to.equal(
          signed.mlDsaSignature + signed.ed25519Signature,
        );
        // Neither half is a signature over the message by itself.
        expect(
          ed25519Verify(p.edPub, message, signed.ed25519Signature).valid,
        ).to.equal(false);
        expect(
          mlDsaVerify(p.level, p.mlDsaPub, message, signed.mlDsaSignature)
            .valid,
        ).to.equal(false);
        expect(
          hybridVerify(
            p.edPub,
            p.mlDsaPub,
            message,
            signed.ed25519Signature,
            signed.mlDsaSignature,
            p.level,
            { context },
          ).valid,
        ).to.equal(true);
      });

      it("has halves that are not signatures over the message on their own", () => {
        expect(ed25519Verify(p.edPub, message, p.s.ed25519).valid).to.equal(
          false,
        );
        expect(
          mlDsaVerify(p.level, p.mlDsaPub, message, p.s.mlDsa).valid,
        ).to.equal(false);
      });
    });
  }

  describe("signatures made before 0.0.36", () => {
    const ed = ed25519.utils.randomSecretKey();
    const ml = mlDsaKeygen(65);
    const legacy = {
      ed25519: hex(ed25519.sign(message, ed)),
      mlDsa: mlDsaSign(65, ml.secretKey, message).signature,
    };
    const verify = (options?: { acceptLegacy?: boolean }) =>
      hybridVerify(
        hex(ed25519.getPublicKey(ed)),
        ml.publicKey,
        message,
        legacy.ed25519,
        legacy.mlDsa,
        65,
        options,
      ).valid;

    it("verify only with acceptLegacy", () => {
      expect(verify()).to.equal(false);
      expect(verify({ acceptLegacy: true })).to.equal(true);
    });
  });

  it("has no ML-DSA-87 + Ed25519 composite to sign with", () => {
    const ml = mlDsaKeygen(87);
    const ed = hex(ed25519.utils.randomSecretKey());
    expect(() => hybridSign(ed, ml.secretKey, message, 87)).to.throw(
      /ML-DSA-87/,
    );
    expect(() =>
      hybridVerify(ed, ml.publicKey, message, "00".repeat(64), "00", 87),
    ).to.throw(/ML-DSA-87/);
  });

  it("verifies a pre-0.0.36 ML-DSA-87 hybrid with acceptLegacy", () => {
    const ml = mlDsaKeygen(87);
    const ed = ed25519.utils.randomSecretKey();
    const valid = hybridVerify(
      hex(ed25519.getPublicKey(ed)),
      ml.publicKey,
      message,
      hex(ed25519.sign(message, ed)),
      mlDsaSign(87, ml.secretKey, message).signature,
      87,
      { acceptLegacy: true },
    ).valid;
    expect(valid).to.equal(true);
  });

  it("with acceptLegacy, still verifies new signatures and refuses bad ones", () => {
    const ml65 = mlDsaKeygen(65);
    const ed = ed25519.utils.randomSecretKey();
    const edPub = hex(ed25519.getPublicKey(ed));
    const signed = hybridSign(hex(ed), ml65.secretKey, message, 65);
    const opts = { acceptLegacy: true };
    expect(
      hybridVerify(
        edPub,
        ml65.publicKey,
        message,
        signed.ed25519Signature,
        signed.mlDsaSignature,
        65,
        opts,
      ).valid,
    ).to.equal(true);
    const ml87 = mlDsaKeygen(87);
    expect(
      hybridVerify(
        edPub,
        ml87.publicKey,
        message,
        signed.ed25519Signature,
        mlDsaSign(87, ml87.secretKey, "other").signature,
        87,
        opts,
      ).valid,
    ).to.equal(false);
  });

  it("refuses a context longer than 255 bytes", () => {
    const ml = mlDsaKeygen(65);
    const ed = hex(ed25519.utils.randomSecretKey());
    expect(() =>
      hybridSign(ed, ml.secretKey, message, 65, {
        context: new Uint8Array(256),
      }),
    ).to.throw(/255/);
  });
});
