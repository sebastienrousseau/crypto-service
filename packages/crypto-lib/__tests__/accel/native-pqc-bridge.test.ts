import { expect } from "chai";
import {
  hasNativePqc,
  pqcBackend,
  resetNativePqcCache,
  _forceNativePqcDetected,
  bridgedMlKemKeygen,
  bridgedMlKemEncapsulate,
  bridgedMlKemDecapsulate,
} from "../../src/accel/native-pqc-bridge";
import type {
  NativeMlKemLevel,
  PqcBackend,
} from "../../src/accel/native-pqc-bridge";

describe("Native PQC Bridge", () => {
  // --- Detection ---

  describe("hasNativePqc", () => {
    afterEach(() => {
      resetNativePqcCache();
    });

    it("should return a boolean", () => {
      const result = hasNativePqc();
      expect(result).to.be.a("boolean");
    });

    it("should return true on Node.js 24+ with native PQC", () => {
      // Node 24.14.0 has crypto.encapsulate/decapsulate
      const major = Number(process.versions.node.split(".")[0]);
      if (major >= 24) {
        expect(hasNativePqc()).to.be.true;
      }
    });

    it("should cache the detection result", () => {
      const first = hasNativePqc();
      const second = hasNativePqc();
      expect(first).to.equal(second);
    });

    it("should reset cache via resetNativePqcCache", () => {
      hasNativePqc(); // populate cache
      resetNativePqcCache();
      // after reset, calling again should still produce a boolean
      expect(hasNativePqc()).to.be.a("boolean");
    });
  });

  describe("pqcBackend", () => {
    afterEach(() => {
      resetNativePqcCache();
    });

    it('should return "native" or "noble"', () => {
      const backend: PqcBackend = pqcBackend();
      expect(["native", "noble"]).to.include(backend);
    });

    it('should return "native" when hasNativePqc() is true', () => {
      if (hasNativePqc()) {
        expect(pqcBackend()).to.equal("native");
      }
    });

    it('should return "noble" when native detection is forced to false', () => {
      _forceNativePqcDetected(false);
      expect(pqcBackend()).to.equal("noble");
    });
  });

  // --- Key Generation ---

  describe("bridgedMlKemKeygen", () => {
    const levels: NativeMlKemLevel[] = [512, 768, 1024];
    // Expected raw public key sizes per ML-KEM level
    const expectedPkSizes: Record<NativeMlKemLevel, number> = {
      512: 800,
      768: 1184,
      1024: 1568,
    };
    // Expected raw secret key sizes per ML-KEM level
    const expectedSkSizes: Record<NativeMlKemLevel, number> = {
      512: 1632,
      768: 2400,
      1024: 3168,
    };

    for (const level of levels) {
      it(`should generate a valid ML-KEM-${level} key pair`, () => {
        const { publicKey, secretKey } = bridgedMlKemKeygen(level);
        expect(publicKey).to.be.an.instanceOf(Uint8Array);
        expect(secretKey).to.be.an.instanceOf(Uint8Array);
        expect(publicKey.length).to.equal(expectedPkSizes[level]);
        expect(secretKey.length).to.equal(expectedSkSizes[level]);
      });
    }

    it("should generate distinct key pairs each time", () => {
      const kp1 = bridgedMlKemKeygen(768);
      const kp2 = bridgedMlKemKeygen(768);
      expect(Buffer.from(kp1.publicKey).equals(Buffer.from(kp2.publicKey))).to
        .be.false;
    });

    it("should throw for an invalid level", () => {
      expect(() => bridgedMlKemKeygen(256 as NativeMlKemLevel)).to.throw(
        "Unsupported ML-KEM level: 256",
      );
    });
  });

  // --- Encapsulate + Decapsulate Round-Trip ---

  describe("bridgedMlKemEncapsulate / bridgedMlKemDecapsulate", () => {
    const levels: NativeMlKemLevel[] = [512, 768, 1024];

    for (const level of levels) {
      describe(`ML-KEM-${level}`, () => {
        it("should produce a ciphertext and shared secret", () => {
          const { publicKey } = bridgedMlKemKeygen(level);
          const { cipherText, sharedSecret } = bridgedMlKemEncapsulate(
            level,
            publicKey,
          );
          expect(cipherText).to.be.an.instanceOf(Uint8Array);
          expect(cipherText.length).to.be.greaterThan(0);
          expect(sharedSecret).to.be.an.instanceOf(Uint8Array);
          expect(sharedSecret.length).to.equal(32);
        });

        it("should round-trip: decapsulated secret matches encapsulated secret", () => {
          const { publicKey, secretKey } = bridgedMlKemKeygen(level);
          const { cipherText, sharedSecret: encSecret } =
            bridgedMlKemEncapsulate(level, publicKey);
          const decSecret = bridgedMlKemDecapsulate(
            level,
            cipherText,
            secretKey,
          );
          expect(Buffer.from(decSecret).equals(Buffer.from(encSecret))).to.be
            .true;
        });
      });
    }

    it("should throw for an invalid level in encapsulate", () => {
      const { publicKey } = bridgedMlKemKeygen(512);
      expect(() =>
        bridgedMlKemEncapsulate(999 as NativeMlKemLevel, publicKey),
      ).to.throw("Unsupported ML-KEM level: 999");
    });

    it("should throw for an invalid level in decapsulate", () => {
      const { publicKey, secretKey } = bridgedMlKemKeygen(512);
      const { cipherText } = bridgedMlKemEncapsulate(512, publicKey);
      expect(() =>
        bridgedMlKemDecapsulate(999 as NativeMlKemLevel, cipherText, secretKey),
      ).to.throw("Unsupported ML-KEM level: 999");
    });

    it("should produce different shared secrets for different key pairs", () => {
      const kp1 = bridgedMlKemKeygen(768);
      const kp2 = bridgedMlKemKeygen(768);
      const { sharedSecret: ss1 } = bridgedMlKemEncapsulate(768, kp1.publicKey);
      const { sharedSecret: ss2 } = bridgedMlKemEncapsulate(768, kp2.publicKey);
      expect(Buffer.from(ss1).equals(Buffer.from(ss2))).to.be.false;
    });
  });
});
