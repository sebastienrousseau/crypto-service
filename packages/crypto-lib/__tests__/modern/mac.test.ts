/**
 * Tests for HMAC (Hash-based Message Authentication Code).
 */
import { expect } from "chai";
import {
  computeHmac,
  verifyHmac,
  HMAC_ALGORITHMS,
  HmacAlgorithm,
  computeKmac,
  verifyKmac,
  KMAC_ALGORITHMS,
  KmacAlgorithm,
} from "../../src/modern/mac";

describe("HMAC", () => {
  const key = "aa".repeat(32); // 32-byte hex key

  describe("computeHmac", () => {
    const algorithms: HmacAlgorithm[] = [
      "sha256",
      "sha384",
      "sha512",
      "sha3-256",
      "sha3-512",
    ];

    for (const algo of algorithms) {
      it(`should compute HMAC with ${algo}`, () => {
        const result = computeHmac({
          algorithm: algo,
          key,
          data: "hello world",
        });
        expect(result.algorithm).to.equal(algo);
        expect(result.mac).to.be.a("string");
        expect(result.mac.length).to.be.greaterThan(0);
        // All hex chars
        expect(result.mac).to.match(/^[0-9a-f]+$/);
      });
    }

    it("should produce deterministic output", () => {
      const r1 = computeHmac({ algorithm: "sha256", key, data: "same" });
      const r2 = computeHmac({ algorithm: "sha256", key, data: "same" });
      expect(r1.mac).to.equal(r2.mac);
    });

    it("should produce different MACs for different data", () => {
      const r1 = computeHmac({ algorithm: "sha256", key, data: "aaa" });
      const r2 = computeHmac({ algorithm: "sha256", key, data: "bbb" });
      expect(r1.mac).to.not.equal(r2.mac);
    });

    it("should produce different MACs for different keys", () => {
      const key2 = "bb".repeat(32);
      const r1 = computeHmac({ algorithm: "sha256", key, data: "same" });
      const r2 = computeHmac({ algorithm: "sha256", key: key2, data: "same" });
      expect(r1.mac).to.not.equal(r2.mac);
    });

    it("should produce correct output length for sha256 (32 bytes = 64 hex)", () => {
      const result = computeHmac({
        algorithm: "sha256",
        key,
        data: "test",
      });
      expect(result.mac).to.have.length(64);
    });

    it("should produce correct output length for sha384 (48 bytes = 96 hex)", () => {
      const result = computeHmac({
        algorithm: "sha384",
        key,
        data: "test",
      });
      expect(result.mac).to.have.length(96);
    });

    it("should produce correct output length for sha512 (64 bytes = 128 hex)", () => {
      const result = computeHmac({
        algorithm: "sha512",
        key,
        data: "test",
      });
      expect(result.mac).to.have.length(128);
    });

    it("should accept Uint8Array key", () => {
      const keyBytes = new Uint8Array(32).fill(0xcc);
      const result = computeHmac({
        algorithm: "sha256",
        key: keyBytes,
        data: "test",
      });
      expect(result.mac).to.be.a("string");
      expect(result.mac.length).to.be.greaterThan(0);
    });

    it("should accept Uint8Array data", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const result = computeHmac({
        algorithm: "sha256",
        key,
        data,
      });
      expect(result.mac).to.be.a("string");
      expect(result.mac.length).to.be.greaterThan(0);
    });
  });

  describe("verifyHmac", () => {
    it("should verify correct MAC for sha256", () => {
      const computed = computeHmac({
        algorithm: "sha256",
        key,
        data: "hello",
      });
      const result = verifyHmac({
        algorithm: "sha256",
        key,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
      expect(result.algorithm).to.equal("sha256");
    });

    it("should verify correct MAC for sha384", () => {
      const computed = computeHmac({
        algorithm: "sha384",
        key,
        data: "hello",
      });
      const result = verifyHmac({
        algorithm: "sha384",
        key,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
    });

    it("should verify correct MAC for sha512", () => {
      const computed = computeHmac({
        algorithm: "sha512",
        key,
        data: "hello",
      });
      const result = verifyHmac({
        algorithm: "sha512",
        key,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
    });

    it("should reject incorrect MAC", () => {
      const computed = computeHmac({
        algorithm: "sha256",
        key,
        data: "hello",
      });
      // Flip the first byte
      const tampered =
        (parseInt(computed.mac.slice(0, 2), 16) ^ 0xff)
          .toString(16)
          .padStart(2, "0") + computed.mac.slice(2);
      const result = verifyHmac({
        algorithm: "sha256",
        key,
        data: "hello",
        mac: tampered,
      });
      expect(result.valid).to.be.false;
    });

    it("should reject MAC computed with different key", () => {
      const computed = computeHmac({
        algorithm: "sha256",
        key,
        data: "hello",
      });
      const wrongKey = "cc".repeat(32);
      const result = verifyHmac({
        algorithm: "sha256",
        key: wrongKey,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.false;
    });

    it("should reject MAC with wrong length", () => {
      const result = verifyHmac({
        algorithm: "sha256",
        key,
        data: "hello",
        mac: "aabb", // 2 bytes vs 32 expected
      });
      expect(result.valid).to.be.false;
    });

    it("should reject MAC with different data", () => {
      const computed = computeHmac({
        algorithm: "sha256",
        key,
        data: "hello",
      });
      const result = verifyHmac({
        algorithm: "sha256",
        key,
        data: "world",
        mac: computed.mac,
      });
      expect(result.valid).to.be.false;
    });

    it("should accept Uint8Array inputs for verification", () => {
      const keyBytes = new Uint8Array(32).fill(0xdd);
      const data = new Uint8Array([10, 20, 30]);
      const computed = computeHmac({
        algorithm: "sha256",
        key: keyBytes,
        data,
      });
      const result = verifyHmac({
        algorithm: "sha256",
        key: keyBytes,
        data,
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
    });
  });

  describe("invalid algorithm", () => {
    it("should throw for unsupported algorithm in computeHmac", () => {
      expect(() =>
        computeHmac({
          algorithm: "md5" as HmacAlgorithm,
          key,
          data: "test",
        }),
      ).to.throw(/Unsupported/);
    });

    it("should throw for unsupported algorithm in verifyHmac", () => {
      expect(() =>
        verifyHmac({
          algorithm: "md5" as HmacAlgorithm,
          key,
          data: "test",
          mac: "aabb",
        }),
      ).to.throw(/Unsupported/);
    });
  });

  describe("HMAC_ALGORITHMS constant", () => {
    it("should contain all expected algorithms", () => {
      expect(HMAC_ALGORITHMS).to.include("sha256");
      expect(HMAC_ALGORITHMS).to.include("sha384");
      expect(HMAC_ALGORITHMS).to.include("sha512");
      expect(HMAC_ALGORITHMS).to.include("sha3-256");
      expect(HMAC_ALGORITHMS).to.include("sha3-512");
      expect(HMAC_ALGORITHMS).to.have.length(5);
    });
  });
});

describe("KMAC", () => {
  const key = "aa".repeat(32);

  describe("computeKmac", () => {
    const algorithms: KmacAlgorithm[] = ["kmac-128", "kmac-256"];

    for (const algo of algorithms) {
      it(`should compute KMAC with ${algo}`, () => {
        const result = computeKmac({
          algorithm: algo,
          key,
          data: "hello world",
        });
        expect(result.algorithm).to.equal(algo);
        expect(result.mac).to.be.a("string");
        expect(result.mac).to.match(/^[0-9a-f]+$/);
      });
    }

    it("should produce correct default output length for kmac-128 (32 bytes = 64 hex)", () => {
      const result = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "test",
      });
      expect(result.mac).to.have.length(64);
    });

    it("should produce correct default output length for kmac-256 (64 bytes = 128 hex)", () => {
      const result = computeKmac({
        algorithm: "kmac-256",
        key,
        data: "test",
      });
      expect(result.mac).to.have.length(128);
    });

    it("should produce deterministic output", () => {
      const r1 = computeKmac({ algorithm: "kmac-128", key, data: "same" });
      const r2 = computeKmac({ algorithm: "kmac-128", key, data: "same" });
      expect(r1.mac).to.equal(r2.mac);
    });

    it("should produce different MACs for different data", () => {
      const r1 = computeKmac({ algorithm: "kmac-128", key, data: "aaa" });
      const r2 = computeKmac({ algorithm: "kmac-128", key, data: "bbb" });
      expect(r1.mac).to.not.equal(r2.mac);
    });

    it("should produce different MACs for different keys", () => {
      const key2 = "bb".repeat(32);
      const r1 = computeKmac({ algorithm: "kmac-128", key, data: "same" });
      const r2 = computeKmac({ algorithm: "kmac-128", key: key2, data: "same" });
      expect(r1.mac).to.not.equal(r2.mac);
    });

    it("should support customization string", () => {
      const r1 = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "test",
        customization: "custom-a",
      });
      const r2 = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "test",
        customization: "custom-b",
      });
      expect(r1.mac).to.not.equal(r2.mac);
    });

    it("should support custom output length", () => {
      const result = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "test",
        outputLength: 16,
      });
      expect(result.mac).to.have.length(32); // 16 bytes = 32 hex
    });

    it("should accept Uint8Array key", () => {
      const keyBytes = new Uint8Array(32).fill(0xcc);
      const result = computeKmac({
        algorithm: "kmac-128",
        key: keyBytes,
        data: "test",
      });
      expect(result.mac).to.be.a("string");
      expect(result.mac.length).to.be.greaterThan(0);
    });

    it("should accept Uint8Array data", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const result = computeKmac({
        algorithm: "kmac-256",
        key,
        data,
      });
      expect(result.mac).to.be.a("string");
      expect(result.mac.length).to.be.greaterThan(0);
    });
  });

  describe("verifyKmac", () => {
    it("should verify correct MAC for kmac-128", () => {
      const computed = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "hello",
      });
      const result = verifyKmac({
        algorithm: "kmac-128",
        key,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
      expect(result.algorithm).to.equal("kmac-128");
    });

    it("should verify correct MAC for kmac-256", () => {
      const computed = computeKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
      });
      const result = verifyKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
        mac: computed.mac,
      });
      expect(result.valid).to.be.true;
    });

    it("should reject incorrect MAC", () => {
      const computed = computeKmac({
        algorithm: "kmac-128",
        key,
        data: "hello",
      });
      const tampered =
        (parseInt(computed.mac.slice(0, 2), 16) ^ 0xff)
          .toString(16)
          .padStart(2, "0") + computed.mac.slice(2);
      const result = verifyKmac({
        algorithm: "kmac-128",
        key,
        data: "hello",
        mac: tampered,
      });
      expect(result.valid).to.be.false;
    });

    it("should verify with customization string", () => {
      const computed = computeKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
        customization: "my-app",
      });
      const result = verifyKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
        mac: computed.mac,
        customization: "my-app",
      });
      expect(result.valid).to.be.true;
    });

    it("should reject with wrong customization string", () => {
      const computed = computeKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
        customization: "my-app",
      });
      const result = verifyKmac({
        algorithm: "kmac-256",
        key,
        data: "hello",
        mac: computed.mac,
        customization: "wrong-app",
      });
      expect(result.valid).to.be.false;
    });
  });

  describe("invalid algorithm", () => {
    it("should throw for unsupported algorithm in computeKmac", () => {
      expect(() =>
        computeKmac({
          algorithm: "kmac-512" as KmacAlgorithm,
          key,
          data: "test",
        }),
      ).to.throw(/Unsupported/);
    });

    it("should throw for unsupported algorithm in verifyKmac", () => {
      expect(() =>
        verifyKmac({
          algorithm: "kmac-512" as KmacAlgorithm,
          key,
          data: "test",
          mac: "aabb",
        }),
      ).to.throw(/Unsupported/);
    });
  });

  describe("KMAC_ALGORITHMS constant", () => {
    it("should contain all expected algorithms", () => {
      expect(KMAC_ALGORITHMS).to.include("kmac-128");
      expect(KMAC_ALGORITHMS).to.include("kmac-256");
      expect(KMAC_ALGORITHMS).to.have.length(2);
    });
  });
});
