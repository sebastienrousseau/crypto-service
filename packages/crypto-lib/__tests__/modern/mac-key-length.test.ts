/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// computeHmac, verifyHmac, computeKmac and verifyKmac accepted a key of
// any length, the empty key included, so a missing or truncated secret
// produced MACs anyone could forge. Keys shorter than 16 bytes (128 bits)
// are now refused.
import { expect } from "chai";
import {
  computeHmac,
  computeKmac,
  verifyHmac,
  verifyKmac,
} from "../../src/modern/mac";
import { CryptoError } from "../../src/errors";

const SHORT = ["", "aa", "aa".repeat(15)];
const OK = "aa".repeat(16);

describe("MAC key length", () => {
  for (const key of SHORT) {
    const bytes = key.length / 2;
    it(`refuses a ${bytes}-byte key for HMAC and KMAC`, () => {
      const message = `MAC key must be at least 16 bytes, got ${bytes}`;
      expect(() =>
        computeHmac({ algorithm: "sha256", key, data: "x" }),
      ).to.throw(message);
      expect(() =>
        verifyHmac({ algorithm: "sha256", key, data: "x", mac: "00" }),
      ).to.throw(message);
      expect(() =>
        computeKmac({ algorithm: "kmac-128", key, data: "x" }),
      ).to.throw(message);
      expect(() =>
        verifyKmac({ algorithm: "kmac-256", key, data: "x", mac: "00" }),
      ).to.throw(message);
    });
  }

  it("throws a CryptoError with code INVALID_KEY", () => {
    try {
      computeHmac({ algorithm: "sha256", key: "aa", data: "x" });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).to.be.instanceOf(CryptoError);
      expect((e as CryptoError).code).to.equal("INVALID_KEY");
    }
  });

  it("accepts a 16-byte key", () => {
    const { mac } = computeHmac({ algorithm: "sha256", key: OK, data: "x" });
    expect(
      verifyHmac({ algorithm: "sha256", key: OK, data: "x", mac }).valid,
    ).to.equal(true);
    const kmac = computeKmac({ algorithm: "kmac-128", key: OK, data: "x" });
    expect(
      verifyKmac({ algorithm: "kmac-128", key: OK, data: "x", mac: kmac.mac })
        .valid,
    ).to.equal(true);
  });
});
