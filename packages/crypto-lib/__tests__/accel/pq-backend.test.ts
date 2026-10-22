/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Differential tests for the native post-quantum back end: every key,
// ciphertext and signature it produces must work with @noble/post-quantum
// and the other way round, and inputs noble refuses must be refused with
// noble's error.
import { expect } from "chai";
import * as noble from "./noble-pq";
import * as backend from "../../src/accel/pq-backend";

const msg = new TextEncoder().encode("differential test message");
const flip = (b: Uint8Array, i = 0) => {
  const out = Uint8Array.from(b);
  out[i] = out[i]! ^ 1;
  return out;
};
const thrown = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return "no error";
};

describe("native post-quantum back end", function () {
  this.timeout(120000);

  it("runs every routed algorithm natively on this runtime", () => {
    // Node.js 24.7+ with OpenSSL 3.5; CI runs Node 24.
    expect(backend.nativeAlgorithms()).to.have.length(18);
  });

  for (const level of [512, 768, 1024] as const) {
    const n = noble[`ml_kem${level}`];
    const b = backend[`ml_kem${level}`];

    describe(`ML-KEM-${level}`, () => {
      it("native keys, ciphertexts and secrets interoperate with noble", () => {
        const before = backend.nativeFallbacks();
        const kp = b.keygen();
        expect(n.getPublicKey(kp.secretKey)).to.deep.equal(kp.publicKey);
        const toNoble = b.encapsulate(kp.publicKey);
        expect(n.decapsulate(toNoble.cipherText, kp.secretKey)).to.deep.equal(
          toNoble.sharedSecret,
        );
        const fromNoble = n.encapsulate(kp.publicKey);
        expect(b.decapsulate(fromNoble.cipherText, kp.secretKey)).to.deep.equal(
          fromNoble.sharedSecret,
        );
        expect(backend.nativeFallbacks(), "native calls fell back").to.equal(
          before,
        );
      });

      it("implicitly rejects a modified ciphertext as noble does", () => {
        const kp = n.keygen();
        const bad = flip(n.encapsulate(kp.publicKey).cipherText, 5);
        expect(b.decapsulate(bad, kp.secretKey)).to.deep.equal(
          n.decapsulate(bad, kp.secretKey),
        );
      });

      it("refuses malformed keys with noble's error", () => {
        const before = backend.nativeFallbacks();
        const kp = n.keygen();
        const short = kp.publicKey.subarray(1);
        expect(thrown(() => b.encapsulate(short))).to.equal(
          thrown(() => n.encapsulate(short)),
        );
        expect(
          thrown(() => b.decapsulate(new Uint8Array(3), kp.secretKey)),
        ).to.equal(
          thrown(() => n.decapsulate(new Uint8Array(3), kp.secretKey)),
        );
        expect(backend.nativeFallbacks()).to.be.greaterThan(before);
      });

      it("uses noble for seeded key generation and fixed randomness", () => {
        const seed = new Uint8Array(64).fill(7);
        expect(b.keygen(seed)).to.deep.equal(n.keygen(seed));
        const kp = n.keygen(seed);
        const m = new Uint8Array(32).fill(9);
        expect(b.encapsulate(kp.publicKey, m)).to.deep.equal(
          n.encapsulate(kp.publicKey, m),
        );
      });
    });
  }

  const signers: Array<[string, boolean]> = [
    ["ml_dsa44", true],
    ["ml_dsa65", true],
    ["ml_dsa87", true],
    ...(
      [
        "sha2_128f",
        "sha2_128s",
        "sha2_192f",
        "sha2_192s",
        "sha2_256f",
        "sha2_256s",
        "shake_128f",
        "shake_128s",
        "shake_192f",
        "shake_192s",
        "shake_256f",
        "shake_256s",
      ] as const
    ).map((v): [string, boolean] => [`slh_dsa_${v}`, v.endsWith("f")]),
  ];

  for (const [name, nobleSignsFast] of signers) {
    const n = (noble as unknown as Record<string, typeof noble.ml_dsa44>)[
      name
    ]!;
    const b = (backend as unknown as Record<string, typeof noble.ml_dsa44>)[
      name
    ]!;

    describe(name, () => {
      it("native signatures verify with noble, and fail when changed", () => {
        const before = backend.nativeFallbacks();
        const kp = b.keygen();
        const sig = b.sign(msg, kp.secretKey);
        expect(n.verify(sig, msg, kp.publicKey)).to.equal(true);
        expect(b.verify(sig, msg, kp.publicKey)).to.equal(true);
        expect(backend.nativeFallbacks(), "native calls fell back").to.equal(
          before,
        );
        expect(b.verify(flip(sig, 10), msg, kp.publicKey)).to.equal(false);
        expect(b.verify(sig, flip(msg), kp.publicKey)).to.equal(false);
        expect(b.verify(sig.subarray(1), msg, kp.publicKey)).to.equal(false);
      });

      if (nobleSignsFast) {
        it("verifies noble signatures natively", () => {
          const kp = n.keygen();
          const sig = n.sign(msg, kp.secretKey);
          expect(b.verify(sig, msg, kp.publicKey)).to.equal(true);
        });
      }
    });
  }

  it("leaves signing with options to noble", () => {
    const kp = noble.ml_dsa44.keygen(new Uint8Array(32).fill(1));
    const opts = { extraEntropy: false as const };
    expect(backend.ml_dsa44.sign(msg, kp.secretKey, opts)).to.deep.equal(
      noble.ml_dsa44.sign(msg, kp.secretKey, opts),
    );
    const sig = noble.ml_dsa44.sign(msg, kp.secretKey);
    expect(backend.ml_dsa44.verify(sig, msg, kp.publicKey, {})).to.equal(true);
    expect(backend.ml_dsa44.keygen(new Uint8Array(32).fill(1))).to.deep.equal(
      kp,
    );
  });

  describe("runtime crypto", () => {
    it("loads node:crypto without importing it", () => {
      expect(backend.runtimeCrypto()?.generateKeyPairSync).to.be.a("function");
    });

    it("is null where process.getBuiltinModule is missing", () => {
      const getBuiltinModule = process.getBuiltinModule;
      try {
        (process as { getBuiltinModule?: unknown }).getBuiltinModule =
          undefined;
        expect(backend.runtimeCrypto()).to.equal(null);
      } finally {
        process.getBuiltinModule = getBuiltinModule;
      }
    });

    it("keeps everything on noble without it", () => {
      expect(
        backend.probe(
          "ml-kem-768",
          { publicKey: 1184, secretKey: 2400 },
          true,
          null,
        ),
      ).to.equal(undefined);
    });
  });

  describe("probe", () => {
    it("reports an algorithm the runtime lacks as not native", () => {
      expect(
        backend.probe(
          "no-such-algorithm",
          { publicKey: 1, secretKey: 1 },
          true,
        ),
      ).to.equal(undefined);
    });

    it("stays on noble when the expanded secret key is not exported", () => {
      // A secret-key size that does not end the PKCS#8 encoding stands
      // for a seed-only private key, which Node.js 26 exports by default.
      expect(
        backend.probe("ml-kem-768", { publicKey: 1184, secretKey: 2401 }, true),
      ).to.equal(undefined);
    });
  });
});
