/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { AlgorithmNegotiationError, negotiateAlgorithm } from "../src";

// negotiateAlgorithm used to fall back silently to classical X25519
// (graded NIST category 1) when nothing met the caller's requirements,
// marked results "DORA Article 13 compliant" from the security level
// alone, and named hybrids differently from crypto-lib. It now refuses
// to downgrade, never selects a classical algorithm unless allowed, and
// uses crypto-lib's names.

describe("negotiateAlgorithm", () => {
  it("prefers the strongest hybrid by default", () => {
    const res = negotiateAlgorithm();
    expect(res.selectedAlgorithm).to.equal("x448-ml-kem-1024");
    expect(res.securityCategory).to.equal(5);
    expect(res.compliancePosture).to.not.have.property(
      "doraArticle13Compliant",
    );
  });

  it("uses crypto-lib's algorithm names and accepts the old ones", () => {
    const res = negotiateAlgorithm({ maxPayloadBytes: 1500 });
    expect(res.selectedAlgorithm).to.equal("x25519-ml-kem-768");
    expect(
      negotiateAlgorithm({ clientSupportedAlgorithms: ["x25519-mlkem768"] })
        .selectedAlgorithm,
    ).to.equal("x25519-ml-kem-768");
  });

  it("never treats classical X25519 as post-quantum", () => {
    expect(() =>
      negotiateAlgorithm({ clientSupportedAlgorithms: ["x25519"] }),
    ).to.throw(AlgorithmNegotiationError);
    const classical = negotiateAlgorithm({
      clientSupportedAlgorithms: ["x25519"],
      allowClassical: true,
    });
    expect(classical.selectedAlgorithm).to.equal("x25519");
    expect(classical.securityCategory).to.equal(0);
  });

  it("refuses rather than downgrading when nothing qualifies", () => {
    expect(() =>
      negotiateAlgorithm({
        clientSupportedAlgorithms: ["unknown-algorithm-xyz"],
      }),
    ).to.throw(AlgorithmNegotiationError, /no algorithm/i);
    expect(() =>
      negotiateAlgorithm({
        securityCategoryMin: 5,
        requireHybrid: true,
        clientSupportedAlgorithms: ["ml-kem-1024"],
      }),
    ).to.throw(AlgorithmNegotiationError);
  });

  it("does not pick a classical algorithm to fit a small payload", () => {
    const res = negotiateAlgorithm({ maxPayloadBytes: 100 });
    expect(res.selectedAlgorithm).to.not.equal("x25519");
    expect(res.fitsWithinMtu).to.equal(false);
  });

  it("reports when the selected algorithm does not fit the payload limit", () => {
    const res = negotiateAlgorithm({
      securityCategoryMin: 5,
      maxPayloadBytes: 500,
    });
    expect(res.fitsWithinMtu).to.equal(false);
    expect(res.selectedAlgorithm).to.equal("x448-ml-kem-1024");
  });
});
