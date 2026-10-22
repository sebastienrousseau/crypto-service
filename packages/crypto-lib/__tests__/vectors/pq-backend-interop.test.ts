/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Cross-checks of the native post-quantum back end's signatures with
// @noble/post-quantum, for every ML-DSA and SLH-DSA parameter set: native
// signatures verify with noble and fail when changed, and noble's verify
// natively. Moved from accel/pq-backend.test.ts to run without coverage:
// V8's block counting slows noble's Keccak (the SLH-DSA SHAKE variants)
// about 23 times, past the test timeout, and these tests reach no
// crypto-lib code the coverage run does not.
import { expect } from "chai";
import * as noble from "../accel/noble-pq";
import * as backend from "../../src/accel/pq-backend";

const msg = new TextEncoder().encode("differential test message");
const flip = (b: Uint8Array, i = 0) => {
  const out = Uint8Array.from(b);
  out[i] = out[i]! ^ 1;
  return out;
};

describe("native post-quantum signatures against noble", function () {
  this.timeout(120000);

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
});
