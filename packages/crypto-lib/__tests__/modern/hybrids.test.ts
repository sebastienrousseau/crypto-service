import { expect } from "chai";
import {
  p256MlKemKeygen,
  p256MlKemEncapsulate,
  p256MlKemDecapsulate,
  x448MlKemKeygen,
  x448MlKemEncapsulate,
  x448MlKemDecapsulate,
} from "../../src/modern/pq-kem";

describe("P-256 + ML-KEM-768 Hybrid", () => {
  it("should generate a key pair", () => {
    const kp = p256MlKemKeygen();
    expect(kp.p256PrivateKey).to.be.a("string");
    expect(kp.p256PublicKey).to.be.a("string");
    expect(kp.mlKemPublicKey).to.be.a("string");
    expect(kp.mlKemSecretKey).to.be.a("string");
    expect(kp.algorithm).to.equal("p256-ml-kem-768");
  });

  it("should encapsulate and decapsulate to produce matching shared secrets", () => {
    const kp = p256MlKemKeygen();
    const enc = p256MlKemEncapsulate(kp.p256PublicKey, kp.mlKemPublicKey);
    expect(enc.sharedSecret).to.have.length(64); // 32 bytes
    expect(enc.algorithm).to.equal("p256-ml-kem-768");

    const dec = p256MlKemDecapsulate(
      kp.p256PrivateKey,
      kp.mlKemSecretKey,
      enc.p256EphemeralPublic,
      enc.mlKemCiphertext,
    );
    expect(dec.sharedSecret).to.equal(enc.sharedSecret);
    expect(dec.algorithm).to.equal("p256-ml-kem-768");
  });
});

describe("X448 + ML-KEM-1024 Hybrid", () => {
  it("should generate a key pair", () => {
    const kp = x448MlKemKeygen();
    expect(kp.x448PrivateKey).to.be.a("string");
    expect(kp.x448PublicKey).to.be.a("string");
    expect(kp.mlKemPublicKey).to.be.a("string");
    expect(kp.mlKemSecretKey).to.be.a("string");
    expect(kp.algorithm).to.equal("x448-ml-kem-1024");
  });

  it("should encapsulate and decapsulate to produce matching shared secrets", () => {
    const kp = x448MlKemKeygen();
    const enc = x448MlKemEncapsulate(kp.x448PublicKey, kp.mlKemPublicKey);
    expect(enc.sharedSecret).to.have.length(64); // 32 bytes
    expect(enc.algorithm).to.equal("x448-ml-kem-1024");

    const dec = x448MlKemDecapsulate(
      kp.x448PrivateKey,
      kp.mlKemSecretKey,
      enc.x448EphemeralPublic,
      enc.mlKemCiphertext,
    );
    expect(dec.sharedSecret).to.equal(enc.sharedSecret);
    expect(dec.algorithm).to.equal("x448-ml-kem-1024");
  });

  it("should produce different shared secrets for different key pairs", () => {
    const kp1 = x448MlKemKeygen();
    const kp2 = x448MlKemKeygen();
    const enc1 = x448MlKemEncapsulate(kp1.x448PublicKey, kp1.mlKemPublicKey);
    const enc2 = x448MlKemEncapsulate(kp2.x448PublicKey, kp2.mlKemPublicKey);
    expect(enc1.sharedSecret).to.not.equal(enc2.sharedSecret);
  });
});
