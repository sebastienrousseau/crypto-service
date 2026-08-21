/**
 * Additional KDF branch coverage tests.
 *
 * Targets kdf.ts lines 66, 84-86, 96 — the toBytes encoding path
 * where input is already Uint8Array or salt is Uint8Array.
 */
import { expect } from "chai";
import { kdfDerive } from "../../src/modern";

describe("KDF – toBytes branch coverage", () => {
  it("should accept Uint8Array password", () => {
    const password = Buffer.from("my-password", "utf8");
    const result = kdfDerive({
      algorithm: "hkdf-sha256",
      password,
      salt: "aa".repeat(16),
    });
    expect(result.derivedKey).to.have.length(64);
  });

  it("should accept Uint8Array salt", () => {
    const salt = Buffer.from("0123456789abcdef", "hex");
    const result = kdfDerive({
      algorithm: "hkdf-sha256",
      password: "test",
      salt,
    });
    expect(result.derivedKey).to.have.length(64);
  });

  it("should accept Uint8Array info for HKDF", () => {
    const info = Buffer.from("context-info", "utf8");
    const result = kdfDerive({
      algorithm: "hkdf-sha256",
      password: "test",
      salt: "bb".repeat(16),
      params: { info },
    });
    expect(result.derivedKey).to.have.length(64);
  });

  it("should use default N/r/p for scrypt when params are omitted", () => {
    // This tests params ?? {} + N ?? 131072, r ?? 8, p ?? 1
    // Use very low keyLength to keep it fast
    const result = kdfDerive({
      algorithm: "scrypt",
      password: "test",
      salt: "cc".repeat(16),
      keyLength: 16,
    });
    expect(result.derivedKey).to.have.length(32); // 16 bytes = 32 hex
    expect(result.keyLength).to.equal(16);
  });

  it("should use default iterations for PBKDF2 when not specified", () => {
    const result = kdfDerive({
      algorithm: "pbkdf2-sha256",
      password: "test",
      salt: "dd".repeat(16),
      keyLength: 16,
    });
    expect(result.derivedKey).to.have.length(32);
  });

  it("should handle custom keyLength", () => {
    const result = kdfDerive({
      algorithm: "hkdf-sha256",
      password: "test",
      salt: "ee".repeat(16),
      keyLength: 64,
    });
    expect(result.derivedKey).to.have.length(128); // 64 bytes = 128 hex
    expect(result.keyLength).to.equal(64);
  });
});
