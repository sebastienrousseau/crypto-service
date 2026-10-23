/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// crypto-lib named the same operation two ways (mlKemKeygen and
// mlKemGenerateKeyPair; generateEd25519KeyPair beside mlDsaKeygen), and its
// top-level mlKemEncapsulate handled ML-KEM-768 only while mlKemEncap took
// a level. Names are now algorithm first: <algorithm>Keygen, and
// mlKemEncapsulate/mlKemDecapsulate take the level. The old names remain
// as deprecated aliases and keep working.
import { expect } from "chai";
import * as modern from "../../src/modern";

describe("deprecated names still work", function () {
  this.timeout(30000);

  it("classical key generation aliases are the new functions", () => {
    expect(modern.generateEd25519KeyPair).to.equal(modern.ed25519Keygen);
    expect(modern.generateX25519KeyPair).to.equal(modern.x25519Keygen);
    expect(modern.generateP256KeyPair).to.equal(modern.p256Keygen);
    expect(modern.generateP384KeyPair).to.equal(modern.p384Keygen);
    expect(modern.generateEd448KeyPair).to.equal(modern.ed448Keygen);
    expect(modern.generateX448KeyPair).to.equal(modern.x448Keygen);
    expect(modern.generateSchnorrKeyPair).to.equal(modern.schnorrKeygen);
  });

  it("ML-KEM aliases and the one-argument forms agree with the levelled ones", () => {
    const kp = modern.mlKemGenerateKeyPair();
    expect(kp.algorithm).to.equal("ml-kem-768");
    const sent = modern.mlKemEncap(768, kp.publicKey);
    expect(modern.mlKemDecap(768, kp.secretKey, sent.ciphertext)).to.deep.equal(
      modern.mlKemDecapsulate(768, kp.secretKey, sent.ciphertext),
    );
    const oneArg = modern.mlKemEncapsulate(kp.publicKey);
    expect(oneArg.algorithm).to.equal("ml-kem-768");
    expect(
      modern.mlKemDecapsulate(kp.secretKey, oneArg.ciphertext).sharedSecret,
    ).to.equal(oneArg.sharedSecret);
  });
});
