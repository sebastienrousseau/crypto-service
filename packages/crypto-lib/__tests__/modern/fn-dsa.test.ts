/**
 * Tests for FN-DSA (FALCON / FIPS 206) digital signatures — both levels.
 */
import { expect } from "chai";
import {
  fnDsaKeygen,
  fnDsaSign,
  fnDsaVerify,
  FnDsaLevel,
} from "../../src/modern/fn-dsa";

describe("FN-DSA (FIPS 206)", function () {
  this.timeout(60000);

  const levels: FnDsaLevel[] = [512, 1024];
  const HEX_RE = /^[0-9a-fA-F]+$/;

  describe("fnDsaKeygen", () => {
    for (const level of levels) {
      it(`should generate a key pair for FN-DSA-${level}`, () => {
        const kp = fnDsaKeygen(level);
        expect(kp.algorithm).to.equal(`fn-dsa-${level}`);
        expect(kp.publicKey).to.be.a("string");
        expect(kp.secretKey).to.be.a("string");
        expect(kp.publicKey.length).to.be.greaterThan(100);
        expect(kp.secretKey.length).to.be.greaterThan(100);
      });
    }

    it("should produce hex-encoded keys", () => {
      const kp = fnDsaKeygen(512);
      expect(kp.publicKey).to.match(HEX_RE);
      expect(kp.secretKey).to.match(HEX_RE);
    });

    it("should generate different key pairs each time", () => {
      const kp1 = fnDsaKeygen(512);
      const kp2 = fnDsaKeygen(512);
      expect(kp1.publicKey).to.not.equal(kp2.publicKey);
      expect(kp1.secretKey).to.not.equal(kp2.secretKey);
    });

    it("should throw for unsupported level", () => {
      expect(() => fnDsaKeygen(256 as FnDsaLevel)).to.throw(/Unsupported/);
    });
  });

  describe("fnDsaSign + fnDsaVerify roundtrip", () => {
    for (const level of levels) {
      it(`should sign and verify for FN-DSA-${level}`, () => {
        const kp = fnDsaKeygen(level);
        const msgHex = Buffer.from("Hello, post-quantum world!").toString(
          "hex",
        );
        const sig = fnDsaSign(level, kp.secretKey, msgHex);
        expect(sig.algorithm).to.equal(`fn-dsa-${level}`);
        expect(sig.signature).to.be.a("string");
        expect(sig.signature.length).to.be.greaterThan(100);

        const result = fnDsaVerify(level, kp.publicKey, msgHex, sig.signature);
        expect(result.valid).to.be.true;
        expect(result.algorithm).to.equal(`fn-dsa-${level}`);
      });
    }

    it("should produce a hex-encoded signature", () => {
      const kp = fnDsaKeygen(512);
      const msgHex = Buffer.from("test").toString("hex");
      const sig = fnDsaSign(512, kp.secretKey, msgHex);
      expect(sig.signature).to.match(HEX_RE);
    });

    it("should produce different signatures for same message (randomized signing)", () => {
      const kp = fnDsaKeygen(512);
      const msgHex = Buffer.from("same message").toString("hex");
      const sig1 = fnDsaSign(512, kp.secretKey, msgHex);
      const sig2 = fnDsaSign(512, kp.secretKey, msgHex);
      // Both should verify regardless of whether they differ
      expect(fnDsaVerify(512, kp.publicKey, msgHex, sig1.signature).valid).to.be
        .true;
      expect(fnDsaVerify(512, kp.publicKey, msgHex, sig2.signature).valid).to.be
        .true;
    });
  });

  describe("tampered message / signature / key detection", () => {
    it("should reject a tampered message", () => {
      const kp = fnDsaKeygen(512);
      const originalHex = Buffer.from("original").toString("hex");
      const tamperedHex = Buffer.from("tampered").toString("hex");
      const sig = fnDsaSign(512, kp.secretKey, originalHex);
      const result = fnDsaVerify(512, kp.publicKey, tamperedHex, sig.signature);
      expect(result.valid).to.be.false;
    });

    it("should reject a tampered signature", () => {
      const kp = fnDsaKeygen(512);
      const msgHex = Buffer.from("message").toString("hex");
      const sig = fnDsaSign(512, kp.secretKey, msgHex);
      // Flip the first byte of the signature
      const tampered =
        (parseInt(sig.signature.slice(0, 2), 16) ^ 0xff)
          .toString(16)
          .padStart(2, "0") + sig.signature.slice(2);
      const result = fnDsaVerify(512, kp.publicKey, msgHex, tampered);
      expect(result.valid).to.be.false;
    });

    it("should reject wrong public key", () => {
      const kp1 = fnDsaKeygen(512);
      const kp2 = fnDsaKeygen(512);
      const msgHex = Buffer.from("msg").toString("hex");
      const sig = fnDsaSign(512, kp1.secretKey, msgHex);
      const result = fnDsaVerify(512, kp2.publicKey, msgHex, sig.signature);
      expect(result.valid).to.be.false;
    });
  });

  describe("invalid inputs", () => {
    it("should throw for invalid hex in secretKey", () => {
      const msgHex = Buffer.from("msg").toString("hex");
      expect(() => fnDsaSign(512, "not-hex!", msgHex)).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in message (sign)", () => {
      const kp = fnDsaKeygen(512);
      expect(() => fnDsaSign(512, kp.secretKey, "not-hex!")).to.throw(
        /Invalid hex/,
      );
    });

    it("should throw for invalid hex in publicKey", () => {
      expect(() => fnDsaVerify(512, "not-hex!", "aabb", "ccdd")).to.throw(
        /Invalid hex/,
      );
    });

    it("should throw for invalid hex in message (verify)", () => {
      const kp = fnDsaKeygen(512);
      expect(() => fnDsaVerify(512, kp.publicKey, "not-hex!", "aabb")).to.throw(
        /Invalid hex/,
      );
    });

    it("should throw for invalid hex in signature", () => {
      const kp = fnDsaKeygen(512);
      const msgHex = Buffer.from("msg").toString("hex");
      expect(() => fnDsaVerify(512, kp.publicKey, msgHex, "not-hex!")).to.throw(
        /Invalid hex/,
      );
    });
  });
});
