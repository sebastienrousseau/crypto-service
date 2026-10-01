/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// PASETO v4 known-answer tests: the official paseto-standard vectors,
// copied verbatim (see the fixture's "source" and "source_sha256").
// Encryption and signing must reproduce each token byte for byte, and
// every expect-fail vector must be rejected.

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  localEncryptWithNonce,
  v4local,
  v4public,
} from "../../src/tokens/paseto";

interface Vector {
  name: string;
  "expect-fail": boolean;
  nonce?: string;
  key?: string | null;
  "public-key"?: string;
  "secret-key"?: string;
  token: string;
  payload: string | null;
  footer: string;
  "implicit-assertion": string;
}

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      String(process.env.CRYPTO_KEY_DIR),
      "..",
      "vectors",
      "paseto-v4.json",
    ),
    "utf8",
  ),
) as { vectors: { tests: Vector[] } };

const tests = fixture.vectors.tests;
const opts = (t: Vector) => ({
  footer: t.footer,
  implicit: t["implicit-assertion"],
});

describe("PASETO v4 official test vectors", () => {
  it("covers every vector in the file", () => {
    expect(tests).to.have.length(17);
  });

  for (const t of tests.filter((v) => v.name.startsWith("4-E-"))) {
    it(`${t.name}: v4.local encrypts and decrypts to the vector`, () => {
      const payload = JSON.parse(t.payload!) as Record<string, unknown>;
      const { token } = localEncryptWithNonce(
        { key: t.key!, payload, ...opts(t) },
        Buffer.from(t.nonce!, "hex"),
      );
      expect(token).to.equal(t.token);
      const out = v4local.decrypt({ key: t.key!, token: t.token, ...opts(t) });
      expect(out.payload).to.deep.equal(payload);
    });
  }

  for (const t of tests.filter((v) => v.name.startsWith("4-S-"))) {
    it(`${t.name}: v4.public signs and verifies to the vector`, () => {
      const payload = JSON.parse(t.payload!) as Record<string, unknown>;
      const { token } = v4public.sign({
        secretKey: t["secret-key"]!,
        payload,
        ...opts(t),
      });
      expect(token).to.equal(t.token);
      const out = v4public.verify({
        publicKey: t["public-key"]!,
        token: t.token,
        ...opts(t),
      });
      expect(out.payload).to.deep.equal(payload);
    });
  }

  for (const t of tests.filter((v) => v["expect-fail"])) {
    it(`${t.name}: is rejected`, () => {
      // Vectors that carry a symmetric key are offered to v4.local, the
      // rest to v4.public: each checks that the wrong purpose, version
      // or encoding is refused.
      const attempt = t.key
        ? () => v4local.decrypt({ key: t.key!, token: t.token, ...opts(t) })
        : () =>
            v4public.verify({
              publicKey: t["public-key"]!,
              token: t.token,
              ...opts(t),
            });
      expect(attempt).to.throw();
    });
  }

  it("refuses a nonce that is not 32 bytes", () => {
    expect(() =>
      localEncryptWithNonce(
        { key: "aa".repeat(32), payload: {} },
        new Uint8Array(24),
      ),
    ).to.throw("Nonce must be 32 bytes, got 24");
  });
});
