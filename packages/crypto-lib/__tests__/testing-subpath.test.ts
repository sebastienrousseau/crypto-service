/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// crypto-lib's main entry and its ./accel subpath exported test hooks
// (_resetWasmDetection, _forceNativePqcDetected,
// _resetModernWebCryptoDetection, resetNativePqcCache), and the keystore
// reset was reachable only by loading a built file by path. The hooks now
// live in ./testing alone.
import { expect } from "chai";
import * as main from "../src";
import * as accel from "../src/accel";
import * as testing from "../src/testing";
import { hasNativePqc } from "../src/accel/native-pqc-bridge";

describe("test hooks live in ./testing", () => {
  it("are gone from the main entry and ./accel", () => {
    for (const name of [
      "_resetWasmDetection",
      "_forceNativePqcDetected",
      "_resetModernWebCryptoDetection",
      "resetNativePqcCache",
      "_resetKeystoreForTests",
    ]) {
      expect(main, name).to.not.have.property(name);
      expect(accel, name).to.not.have.property(name);
    }
  });

  it("are exported from ./testing and work", () => {
    expect(Object.keys(testing).sort()).to.deep.equal([
      "forceNativePqcDetected",
      "resetKeystore",
      "resetModernWebCryptoDetection",
      "resetNativePqcCache",
      "resetWasmDetection",
    ]);
    testing.forceNativePqcDetected(false);
    expect(hasNativePqc()).to.equal(false);
    testing.resetNativePqcCache();
    testing.resetWasmDetection();
    testing.resetModernWebCryptoDetection();
    testing.resetKeystore();
  });
});
