/**
 * Tests for SLH-DSA (FIPS 205) — stateless hash-based digital signatures.
 */
import { expect } from "chai";
import {
  slhDsaKeygen,
  slhDsaSign,
  slhDsaVerify,
  SlhDsaVariant,
} from "../../src/modern/pq-hash-sign";

describe("SLH-DSA (FIPS 205)", function () {
  this.timeout(30000);

  // Use only fast variants to avoid multi-second signing times
  const fastVariants: SlhDsaVariant[] = [
    "shake-128f",
    "sha2-128f",
    "sha2-256f",
  ];

  describe("slhDsaKeygen", () => {
    for (const variant of fastVariants) {
      it(`should generate a key pair for ${variant}`, () => {
        const kp = slhDsaKeygen(variant);
        expect(kp.algorithm).to.equal(`slh-dsa-${variant}`);
        expect(kp.publicKey).to.be.a("string");
        expect(kp.secretKey).to.be.a("string");
        expect(kp.publicKey.length).to.be.greaterThan(10);
        expect(kp.secretKey.length).to.be.greaterThan(10);
      });
    }

    it("should generate different key pairs each time", () => {
      const kp1 = slhDsaKeygen("sha2-128f");
      const kp2 = slhDsaKeygen("sha2-128f");
      expect(kp1.publicKey).to.not.equal(kp2.publicKey);
      expect(kp1.secretKey).to.not.equal(kp2.secretKey);
    });

    it("should throw for invalid variant name", () => {
      expect(() =>
        slhDsaKeygen("invalid-variant" as SlhDsaVariant),
      ).to.throw(/Unsupported SLH-DSA variant/);
    });
  });

  describe("slhDsaSign + slhDsaVerify roundtrip", () => {
    for (const variant of fastVariants) {
      it(`should sign and verify for ${variant} (string message)`, () => {
        const kp = slhDsaKeygen(variant);
        const msg = "Hello, hash-based signatures!";
        const sig = slhDsaSign(variant, kp.secretKey, msg);
        expect(sig.algorithm).to.equal(`slh-dsa-${variant}`);
        expect(sig.signature).to.be.a("string");
        expect(sig.signature.length).to.be.greaterThan(100);

        const result = slhDsaVerify(
          variant,
          kp.publicKey,
          msg,
          sig.signature,
        );
        expect(result.valid).to.be.true;
        expect(result.algorithm).to.equal(`slh-dsa-${variant}`);
      });

      it(`should sign and verify for ${variant} (Uint8Array message)`, () => {
        const kp = slhDsaKeygen(variant);
        const msg = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        const sig = slhDsaSign(variant, kp.secretKey, msg);
        const result = slhDsaVerify(
          variant,
          kp.publicKey,
          msg,
          sig.signature,
        );
        expect(result.valid).to.be.true;
      });
    }
  });

  describe("tampered message detection", () => {
    it("should reject a tampered message", () => {
      const kp = slhDsaKeygen("sha2-128f");
      const sig = slhDsaSign("sha2-128f", kp.secretKey, "original");
      const result = slhDsaVerify(
        "sha2-128f",
        kp.publicKey,
        "tampered",
        sig.signature,
      );
      expect(result.valid).to.be.false;
    });

    it("should reject a tampered signature", () => {
      const kp = slhDsaKeygen("sha2-128f");
      const sig = slhDsaSign("sha2-128f", kp.secretKey, "message");
      // Flip the first byte of the signature
      const tampered =
        (parseInt(sig.signature.slice(0, 2), 16) ^ 0xff)
          .toString(16)
          .padStart(2, "0") + sig.signature.slice(2);
      const result = slhDsaVerify(
        "sha2-128f",
        kp.publicKey,
        "message",
        tampered,
      );
      expect(result.valid).to.be.false;
    });

    it("should reject wrong public key", () => {
      const kp1 = slhDsaKeygen("sha2-128f");
      const kp2 = slhDsaKeygen("sha2-128f");
      const sig = slhDsaSign("sha2-128f", kp1.secretKey, "msg");
      const result = slhDsaVerify(
        "sha2-128f",
        kp2.publicKey,
        "msg",
        sig.signature,
      );
      expect(result.valid).to.be.false;
    });
  });

  describe("invalid inputs", () => {
    it("should throw for invalid hex in secretKey", () => {
      expect(() =>
        slhDsaSign("sha2-128f", "not-hex!", "msg"),
      ).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in publicKey", () => {
      expect(() =>
        slhDsaVerify("sha2-128f", "not-hex!", "msg", "aabb"),
      ).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in signature", () => {
      const kp = slhDsaKeygen("sha2-128f");
      expect(() =>
        slhDsaVerify("sha2-128f", kp.publicKey, "msg", "not-hex!"),
      ).to.throw(/Invalid hex/);
    });

    it("should throw for invalid variant in sign", () => {
      expect(() =>
        slhDsaSign("bad-variant" as SlhDsaVariant, "aabb", "msg"),
      ).to.throw(/Unsupported SLH-DSA variant/);
    });

    it("should throw for invalid variant in verify", () => {
      expect(() =>
        slhDsaVerify("bad-variant" as SlhDsaVariant, "aabb", "msg", "ccdd"),
      ).to.throw(/Unsupported SLH-DSA variant/);
    });
  });
});
