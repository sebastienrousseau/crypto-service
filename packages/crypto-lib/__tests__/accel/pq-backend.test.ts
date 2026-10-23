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
import { runtimeCrypto } from "../../src/accel/runtime";

// Node.js 24.7+ with OpenSSL 3.5 runs ML-KEM, ML-DSA and SLH-DSA natively;
// Node.js 22 runs them all on noble. Asked of node:crypto directly, not of
// the back end under test. Coverage, enforced on Node.js 24, proves the
// native paths ran there.
const NATIVE = (() => {
  try {
    runtimeCrypto()?.generateKeyPairSync("ml-kem-512" as "ed25519");
    return true;
  } catch {
    return false;
  }
})();

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

  it("runs every routed algorithm natively where the runtime can", () => {
    expect(backend.nativeAlgorithms()).to.have.length(NATIVE ? 18 : 0);
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
        // Natively, malformed keys throw and are repeated with noble.
        expect(backend.nativeFallbacks() - before).to.equal(NATIVE ? 2 : 0);
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

  // The per-signer comparisons with noble are in
  // __tests__/vectors/pq-backend-interop.test.ts: SLH-DSA's SHAKE variants
  // sign about 23 times slower under coverage, so they run without it.

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
      expect(runtimeCrypto()?.generateKeyPairSync).to.be.a("function");
    });

    it("is null where process.getBuiltinModule is missing", () => {
      const getBuiltinModule = process.getBuiltinModule;
      try {
        (process as { getBuiltinModule?: unknown }).getBuiltinModule =
          undefined;
        expect(runtimeCrypto()).to.equal(null);
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
      // for a seed-only private key, and without noble to expand one
      // the probe cannot check that the runtime takes expanded keys.
      expect(
        backend.probe("ml-kem-768", { publicKey: 1184, secretKey: 2401 }, true),
      ).to.equal(undefined);
    });

    describe("on a runtime that exports seed-only private keys", () => {
      // Node.js 24.22+ and 26 export ML-KEM and ML-DSA private keys as
      // the seed alone. Simulated here so every runtime runs these tests.
      const real = runtimeCrypto()!;
      const seedOnly = (overrides: Partial<typeof real> = {}): typeof real => ({
        ...real,
        generateKeyPairSync: ((name: "ed25519") => {
          const pair = real.generateKeyPairSync(name);
          return {
            publicKey: pair.publicKey,
            privateKey: { export: () => Buffer.alloc(86) },
          };
        }) as typeof real.generateKeyPairSync,
        ...overrides,
      });
      const sizes = { publicKey: 1184, secretKey: 2400 };
      const expand = () => noble.ml_kem768.keygen(new Uint8Array(64).fill(1));

      it("generates keys natively where the expanded key is exported", function () {
        if (!NATIVE) this.skip();
        // The PKCS#8 encoding ends with the 2400-byte expanded key.
        const expanded = Buffer.concat([
          Buffer.from([0x04, 0x82, 0x09, 0x60]),
          Buffer.alloc(2400),
        ]);
        const exportsExpanded = seedOnly({
          generateKeyPairSync: ((name: "ed25519") => ({
            publicKey: real.generateKeyPairSync(name).publicKey,
            privateKey: { export: () => expanded },
          })) as typeof real.generateKeyPairSync,
        });
        expect(
          backend.probe("ml-kem-768", sizes, true, exportsExpanded, expand),
        ).to.include({ name: "ml-kem-768", keygen: true });
      });

      it("runs operations natively and generates keys with noble", function () {
        if (!NATIVE) this.skip();
        const native = backend.probe(
          "ml-kem-768",
          sizes,
          true,
          seedOnly(),
          expand,
        );
        expect(native).to.include({ name: "ml-kem-768", keygen: false });
      });

      it("stays on noble when the runtime refuses an expanded key", function () {
        if (!NATIVE) this.skip();
        const refuses = seedOnly({
          createPrivateKey: (() => {
            throw new Error("unsupported");
          }) as typeof real.createPrivateKey,
        });
        expect(
          backend.probe("ml-kem-768", sizes, true, refuses, expand),
        ).to.equal(undefined);
      });

      it("stays on noble when the runtime reads an expanded key differently", function () {
        if (!NATIVE) this.skip();
        const other = noble.ml_kem768.keygen(new Uint8Array(64).fill(2));
        const misreads = () => ({ ...expand(), publicKey: other.publicKey });
        expect(
          backend.probe("ml-kem-768", sizes, true, seedOnly(), misreads),
        ).to.equal(undefined);
      });
    });
  });
});
