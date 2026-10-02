/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of PASETO v4 parsing and round trips with
// fast-check: tokens are untrusted input, so arbitrary strings must be
// rejected with an Error, any single-character change to a valid token
// must be rejected, and valid tokens must round-trip for arbitrary
// payloads, footers and implicit assertions.

import { expect } from "chai";
import fc from "fast-check";
import { ed25519 } from "@noble/curves/ed25519.js";
import { v4local, v4public } from "../../src/tokens/paseto";

const KEY = "aa".repeat(32);
const SEED = Buffer.from("bb".repeat(32), "hex");
const SECRET_KEY = SEED.toString("hex");
const PUBLIC_KEY = Buffer.from(ed25519.getPublicKey(SEED)).toString("hex");

const payloadArb = fc.dictionary(fc.string(), fc.jsonValue());
const optsArb = fc.record({ footer: fc.string(), implicit: fc.string() });

/** The payload as it survives JSON (what a token can carry). */
const asJson = (v: unknown) => JSON.parse(JSON.stringify(v)) as unknown;

/** `token` with the character at `index` replaced by a different one. */
function mutate(token: string, index: number, replacement: string): string {
  const i = index % token.length;
  const c = token[i] === replacement ? "A" : replacement;
  return token.slice(0, i) + (token[i] === c ? "B" : c) + token.slice(i + 1);
}

describe("PASETO v4 fuzzing (fast-check)", () => {
  it("v4.local round-trips arbitrary payloads, footers and implicits", () => {
    fc.assert(
      fc.property(payloadArb, optsArb, (payload, opts) => {
        const { token } = v4local.encrypt({ key: KEY, payload, ...opts });
        const out = v4local.decrypt({ key: KEY, token, ...opts });
        expect(out.payload).to.deep.equal(asJson(payload));
      }),
    );
  });

  it("v4.local rejects any single-character change to a token", () => {
    fc.assert(
      fc.property(
        payloadArb,
        fc.nat(),
        fc.constantFrom("A", "_", "-", "z", "."),
        (payload, index, replacement) => {
          const { token } = v4local.encrypt({ key: KEY, payload });
          const tampered = mutate(token, index, replacement);
          expect(() => v4local.decrypt({ key: KEY, token: tampered })).to.throw(
            Error,
          );
        },
      ),
    );
  });

  it("v4.local rejects arbitrary strings with an Error", () => {
    fc.assert(
      fc.property(fc.string(), fc.boolean(), (tail, withHeader) => {
        const token = (withHeader ? "v4.local." : "") + tail;
        expect(() => v4local.decrypt({ key: KEY, token })).to.throw(Error);
      }),
    );
  });

  it("v4.public round-trips and rejects any single-character change", () => {
    fc.assert(
      fc.property(payloadArb, optsArb, fc.nat(), (payload, opts, index) => {
        const { token } = v4public.sign({
          secretKey: SECRET_KEY,
          payload,
          ...opts,
        });
        const out = v4public.verify({ publicKey: PUBLIC_KEY, token, ...opts });
        expect(out.payload).to.deep.equal(asJson(payload));
        const tampered = mutate(token, index, "_");
        expect(() =>
          v4public.verify({ publicKey: PUBLIC_KEY, token: tampered, ...opts }),
        ).to.throw(Error);
      }),
    );
  });
});
