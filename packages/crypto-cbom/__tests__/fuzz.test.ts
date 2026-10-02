/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing with fast-check: CBOM documents arrive from
// files and stdin, so validateCbom must never throw on arbitrary JSON,
// and every document it accepts must be auditable with a bounded score.

import { expect } from "chai";
import fc from "fast-check";
import {
  auditCbom,
  generateCycloneDxCbom,
  generateSpdxCbom,
  scanCode,
  validateCbom,
} from "../src";

const cdxComponent = fc.record({
  type: fc.constant("cryptographic-asset"),
  name: fc.string({ minLength: 1 }),
});

/** Arbitrary JSON plus documents shaped like the two supported formats. */
const documentArb = fc.oneof(
  fc.jsonValue(),
  fc.record({
    bomFormat: fc.constant("CycloneDX"),
    specVersion: fc.constantFrom("1.6", "1.5"),
    serialNumber: fc.string(),
    components: fc.array(fc.oneof(cdxComponent, fc.jsonValue())),
  }),
  fc.record({
    spdxVersion: fc.constantFrom("SPDX-3.0.0", "SPDX-2.3"),
    elements: fc.array(
      fc.record({ name: fc.string(), algorithm: fc.string() }),
    ),
  }),
);

describe("CBOM fuzzing (fast-check)", () => {
  it("validateCbom never throws, and audits what it accepts", () => {
    fc.assert(
      fc.property(documentArb, (doc) => {
        const result = validateCbom(doc);
        expect(result.valid).to.be.a("boolean");
        if (!result.valid) return;
        const audit = auditCbom(doc as Parameters<typeof auditCbom>[0]);
        expect(audit.score).to.be.within(0, 100);
      }),
    );
  });

  it("CycloneDX and SPDX audits agree for any scanned source", () => {
    const calls = fc.constantFrom(
      "createHash('md5')",
      "createHash('sha256')",
      "generateKeyPairSync('rsa')",
      "ml_kem768.keygen()",
      "createCipheriv('aes-256-gcm')",
    );
    fc.assert(
      fc.property(fc.array(calls, { maxLength: 8 }), (lines) => {
        const assets = scanCode(lines.join(";\n"));
        expect(auditCbom(generateSpdxCbom(assets))).to.deep.equal(
          auditCbom(generateCycloneDxCbom(assets)),
        );
      }),
    );
  });
});
