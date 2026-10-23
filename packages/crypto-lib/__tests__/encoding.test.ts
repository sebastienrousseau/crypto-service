/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// crypto-lib used Node's Buffer for every encoding, so it failed in
// browsers with "Buffer is not defined" (checked in Chrome), although its
// README says it runs there. encoding.ts replaces Buffer with portable
// code; these properties check it against Buffer on random input, and
// that malformed base64 is refused where Buffer skipped it.
import { expect } from "chai";
import fc from "fast-check";
import {
  concat,
  decodeHex,
  fromBase64,
  fromUtf8,
  toBase64,
  toBase64url,
  toHex,
  utf8,
} from "../src/encoding";
import { CryptoError } from "../src/errors";

const bytes = fc.uint8Array({ maxLength: 300 });
const same = (a: Uint8Array, b: Uint8Array) =>
  Buffer.from(a).equals(Buffer.from(b));

describe("portable encodings", () => {
  it("encode and decode as Buffer does", () => {
    fc.assert(
      fc.property(bytes, (b) => {
        const buf = Buffer.from(b);
        expect(toHex(b)).to.equal(buf.toString("hex"));
        expect(toBase64(b)).to.equal(buf.toString("base64"));
        expect(toBase64url(b)).to.equal(buf.toString("base64url"));
        expect(same(decodeHex(buf.toString("hex")), b)).to.equal(true);
        expect(same(fromBase64(buf.toString("base64")), b)).to.equal(true);
        expect(same(fromBase64(buf.toString("base64url")), b)).to.equal(true);
      }),
      { numRuns: 300 },
    );
  });

  it("handles UTF-8 and concatenation as Buffer does", () => {
    fc.assert(
      fc.property(
        fc.string({ unit: "grapheme" }),
        fc.array(bytes),
        (s, parts) => {
          expect(same(utf8(s), Buffer.from(s, "utf8"))).to.equal(true);
          expect(fromUtf8(utf8(s))).to.equal(s);
          expect(same(concat(parts), Buffer.concat(parts))).to.equal(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("ignores whitespace in base64", () => {
    expect(fromBase64(" aGVs\nbG8= ")).to.deep.equal(utf8("hello"));
  });

  it("refuses base64 that Buffer would have decoded silently", () => {
    for (const text of ["a", "aGVsbG8*", "aGVs bG8é", "abcde"]) {
      let err: unknown;
      try {
        fromBase64(text);
      } catch (e) {
        err = e;
      }
      expect(err, text).to.be.instanceOf(CryptoError);
      expect((err as CryptoError).code).to.equal("INVALID_INPUT");
    }
  });

  it("strips padding in linear time", function () {
    // /=+$/ retried from every "=" of a long run that did not end the
    // text: 40,000 of them took 27 s.
    this.timeout(1000);
    const run = "=".repeat(100_000);
    expect(() => fromBase64(`${run}!`)).to.throw(CryptoError);
    expect(fromBase64(`aGVsbG8${run}`)).to.deep.equal(utf8("hello"));
  });
});
