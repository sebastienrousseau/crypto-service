/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// RFC 9497 Appendix A.3.1 known-answer tests for the OPRF that
// src/protocols/pake.ts builds on (P256-SHA256, OPRF mode 0x00). The
// blinding step uses the same DST as the module; the RFC 9807 vectors in
// opaque-rfc9807.test.ts check the module's own blinding end to end.

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { p256, p256_hasher, p256_oprf } from "@noble/curves/nist.js";

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      String(process.env.CRYPTO_KEY_DIR),
      "..",
      "vectors",
      "oprf-rfc9497-p256.json",
    ),
    "utf8",
  ),
);

const h = (s: string) => Buffer.from(s, "hex");
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const OPRF_DST = Buffer.from("HashToGroup-OPRFV1-\x00-P256-SHA256", "latin1");

describe("OPRF P256-SHA256 RFC 9497 test vectors", () => {
  it("derives skSm from Seed and KeyInfo", () => {
    const kp = p256_oprf.oprf.deriveKeyPair(
      h(fixture.seed),
      h(fixture.keyInfo),
    );
    expect(hex(kp.secretKey)).to.equal(fixture.skSm);
  });

  for (const [i, v] of fixture.vectors.entries()) {
    it(`blinds, evaluates and finalizes vector ${i + 1}`, () => {
      const blind = p256.Point.Fn.fromBytes(h(v.blind));
      const blinded = p256_hasher
        .hashToCurve(h(v.input), { DST: OPRF_DST })
        .multiply(blind);
      expect(hex(blinded.toBytes())).to.equal(v.blindedElement);

      const evaluated = p256_oprf.oprf.blindEvaluate(
        h(fixture.skSm),
        h(v.blindedElement),
      );
      expect(hex(evaluated)).to.equal(v.evaluationElement);

      const output = p256_oprf.oprf.finalize(h(v.input), h(v.blind), evaluated);
      expect(hex(output)).to.equal(v.output);
    });
  }
});
