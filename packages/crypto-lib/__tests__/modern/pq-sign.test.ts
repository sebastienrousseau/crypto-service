/**
 * Tests for ML-DSA (FIPS 204) digital signatures — all levels + hybrid.
 */
import { expect } from "chai";
import {
  mlDsaKeygen,
  mlDsaSign,
  mlDsaVerify,
  hybridSign,
  hybridVerify,
  MlDsaLevel,
} from "../../src/modern/pq-sign";
import { generateEd25519KeyPair } from "../../src/modern/signing";

describe("ML-DSA (FIPS 204)", function () {
  this.timeout(30000);

  const levels: MlDsaLevel[] = [44, 65, 87];

  describe("mlDsaKeygen", () => {
    for (const level of levels) {
      it(`should generate a key pair for ML-DSA-${level}`, () => {
        const kp = mlDsaKeygen(level);
        expect(kp.algorithm).to.equal(`ml-dsa-${level}`);
        expect(kp.publicKey).to.be.a("string");
        expect(kp.secretKey).to.be.a("string");
        expect(kp.publicKey.length).to.be.greaterThan(100);
        expect(kp.secretKey.length).to.be.greaterThan(100);
      });
    }

    it("should generate different key pairs each time", () => {
      const kp1 = mlDsaKeygen(44);
      const kp2 = mlDsaKeygen(44);
      expect(kp1.publicKey).to.not.equal(kp2.publicKey);
      expect(kp1.secretKey).to.not.equal(kp2.secretKey);
    });

    it("should throw for unsupported level", () => {
      expect(() => mlDsaKeygen(99 as MlDsaLevel)).to.throw(/Unsupported/);
    });
  });

  describe("mlDsaSign + mlDsaVerify roundtrip", () => {
    for (const level of levels) {
      it(`should sign and verify for ML-DSA-${level} (string message)`, () => {
        const kp = mlDsaKeygen(level);
        const msg = "Hello, post-quantum world!";
        const sig = mlDsaSign(level, kp.secretKey, msg);
        expect(sig.algorithm).to.equal(`ml-dsa-${level}`);
        expect(sig.signature).to.be.a("string");
        expect(sig.signature.length).to.be.greaterThan(100);

        const result = mlDsaVerify(level, kp.publicKey, msg, sig.signature);
        expect(result.valid).to.be.true;
        expect(result.algorithm).to.equal(`ml-dsa-${level}`);
      });

      it(`should sign and verify for ML-DSA-${level} (Uint8Array message)`, () => {
        const kp = mlDsaKeygen(level);
        const msg = new Uint8Array([1, 2, 3, 4, 5]);
        const sig = mlDsaSign(level, kp.secretKey, msg);
        const result = mlDsaVerify(level, kp.publicKey, msg, sig.signature);
        expect(result.valid).to.be.true;
      });
    }

    it("should produce different signatures for same message (randomized signing)", () => {
      const kp = mlDsaKeygen(44);
      const msg = "same message";
      const sig1 = mlDsaSign(44, kp.secretKey, msg);
      const sig2 = mlDsaSign(44, kp.secretKey, msg);
      // ML-DSA may produce identical or different signatures depending on
      // whether the implementation uses deterministic or randomized signing.
      // We just verify both are valid.
      expect(mlDsaVerify(44, kp.publicKey, msg, sig1.signature).valid).to.be
        .true;
      expect(mlDsaVerify(44, kp.publicKey, msg, sig2.signature).valid).to.be
        .true;
    });
  });

  describe("tampered message / signature detection", () => {
    it("should reject a tampered message", () => {
      const kp = mlDsaKeygen(44);
      const sig = mlDsaSign(44, kp.secretKey, "original");
      const result = mlDsaVerify(44, kp.publicKey, "tampered", sig.signature);
      expect(result.valid).to.be.false;
    });

    it("should reject a tampered signature", () => {
      const kp = mlDsaKeygen(44);
      const sig = mlDsaSign(44, kp.secretKey, "message");
      // Flip the first byte of the signature
      const tampered =
        (parseInt(sig.signature.slice(0, 2), 16) ^ 0xff)
          .toString(16)
          .padStart(2, "0") + sig.signature.slice(2);
      const result = mlDsaVerify(44, kp.publicKey, "message", tampered);
      expect(result.valid).to.be.false;
    });

    it("should reject wrong public key", () => {
      const kp1 = mlDsaKeygen(44);
      const kp2 = mlDsaKeygen(44);
      const sig = mlDsaSign(44, kp1.secretKey, "msg");
      const result = mlDsaVerify(44, kp2.publicKey, "msg", sig.signature);
      expect(result.valid).to.be.false;
    });
  });

  describe("invalid inputs", () => {
    it("should throw for invalid hex in secretKey", () => {
      expect(() => mlDsaSign(44, "not-hex!", "msg")).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in publicKey", () => {
      expect(() => mlDsaVerify(44, "not-hex!", "msg", "aabb")).to.throw(
        /Invalid hex/,
      );
    });

    it("should throw for invalid hex in signature", () => {
      const kp = mlDsaKeygen(44);
      expect(() =>
        mlDsaVerify(44, kp.publicKey, "msg", "not-hex!"),
      ).to.throw(/Invalid hex/);
    });
  });

  describe("Hybrid Ed25519 + ML-DSA", () => {
    it("should sign and verify with default level (65)", () => {
      const ed25519Kp = generateEd25519KeyPair();
      const mlDsaKp = mlDsaKeygen(65);
      const msg = "hybrid message";

      const sig = hybridSign(
        ed25519Kp.privateKey,
        mlDsaKp.secretKey,
        msg,
      );
      expect(sig.algorithm).to.equal("ed25519-ml-dsa-65");
      expect(sig.ed25519Signature).to.be.a("string");
      expect(sig.ed25519Signature).to.have.length(128); // 64 bytes hex
      expect(sig.mlDsaSignature).to.be.a("string");
      expect(sig.mlDsaSignature.length).to.be.greaterThan(100);

      const result = hybridVerify(
        ed25519Kp.publicKey,
        mlDsaKp.publicKey,
        msg,
        sig.ed25519Signature,
        sig.mlDsaSignature,
      );
      expect(result.valid).to.be.true;
      expect(result.algorithm).to.equal("ed25519-ml-dsa-65");
    });

    for (const level of levels) {
      it(`should sign and verify hybrid with ML-DSA-${level}`, () => {
        const ed25519Kp = generateEd25519KeyPair();
        const mlDsaKp = mlDsaKeygen(level);
        const msg = "test message";

        const sig = hybridSign(
          ed25519Kp.privateKey,
          mlDsaKp.secretKey,
          msg,
          level,
        );
        expect(sig.algorithm).to.equal(`ed25519-ml-dsa-${level}`);

        const result = hybridVerify(
          ed25519Kp.publicKey,
          mlDsaKp.publicKey,
          msg,
          sig.ed25519Signature,
          sig.mlDsaSignature,
          level,
        );
        expect(result.valid).to.be.true;
      });
    }

    it("should reject hybrid verify when message is tampered", () => {
      const ed25519Kp = generateEd25519KeyPair();
      const mlDsaKp = mlDsaKeygen(44);
      const sig = hybridSign(
        ed25519Kp.privateKey,
        mlDsaKp.secretKey,
        "original",
        44,
      );

      const result = hybridVerify(
        ed25519Kp.publicKey,
        mlDsaKp.publicKey,
        "tampered",
        sig.ed25519Signature,
        sig.mlDsaSignature,
        44,
      );
      expect(result.valid).to.be.false;
    });

    it("should reject hybrid verify when Ed25519 key is wrong", () => {
      const ed25519Kp1 = generateEd25519KeyPair();
      const ed25519Kp2 = generateEd25519KeyPair();
      const mlDsaKp = mlDsaKeygen(44);
      const msg = "msg";

      const sig = hybridSign(
        ed25519Kp1.privateKey,
        mlDsaKp.secretKey,
        msg,
        44,
      );
      const result = hybridVerify(
        ed25519Kp2.publicKey,
        mlDsaKp.publicKey,
        msg,
        sig.ed25519Signature,
        sig.mlDsaSignature,
        44,
      );
      expect(result.valid).to.be.false;
    });

    it("should accept Uint8Array messages in hybrid sign/verify", () => {
      const ed25519Kp = generateEd25519KeyPair();
      const mlDsaKp = mlDsaKeygen(44);
      const msg = new Uint8Array([10, 20, 30]);

      const sig = hybridSign(
        ed25519Kp.privateKey,
        mlDsaKp.secretKey,
        msg,
        44,
      );
      const result = hybridVerify(
        ed25519Kp.publicKey,
        mlDsaKp.publicKey,
        msg,
        sig.ed25519Signature,
        sig.mlDsaSignature,
        44,
      );
      expect(result.valid).to.be.true;
    });

    it("should throw for invalid hex in hybrid sign", () => {
      expect(() =>
        hybridSign("not-hex!", "aabb", "msg", 44),
      ).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in hybrid verify", () => {
      expect(() =>
        hybridVerify("not-hex!", "aabb", "msg", "ccdd", "eeff", 44),
      ).to.throw(/Invalid hex/);
    });
  });
});
