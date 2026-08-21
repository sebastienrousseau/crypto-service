import { expect } from "chai";
import { seal, open } from "../../src/high-level/secretbox";

describe("Secretbox", () => {
  const key = "aa".repeat(32); // 32-byte hex key

  it("should encrypt and decrypt a string", () => {
    const result = seal(key, "Hello, Secretbox!");
    expect(result.algorithm).to.equal("xchacha20-poly1305");
    expect(result.sealed).to.be.a("string");

    const pt = open(key, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("Hello, Secretbox!");
  });

  it("should encrypt and decrypt Uint8Array", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const result = seal(key, data);
    const pt = open(key, result.sealed);
    expect(Array.from(pt)).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it("should accept Uint8Array key", () => {
    const keyBytes = new Uint8Array(32).fill(0xbb);
    const result = seal(keyBytes, "test");
    const pt = open(keyBytes, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("test");
  });

  it("should produce different ciphertexts for same input (random nonce)", () => {
    const r1 = seal(key, "same");
    const r2 = seal(key, "same");
    expect(r1.sealed).to.not.equal(r2.sealed);
  });

  it("should reject wrong key", () => {
    const result = seal(key, "secret");
    const wrongKey = "bb".repeat(32);
    expect(() => open(wrongKey, result.sealed)).to.throw();
  });

  it("should support AAD", () => {
    const aad = Buffer.from("context");
    const result = seal(key, "with aad", aad);
    const pt = open(key, result.sealed, aad);
    expect(Buffer.from(pt).toString("utf8")).to.equal("with aad");
  });

  it("should reject wrong AAD", () => {
    const result = seal(key, "with aad", Buffer.from("context"));
    expect(() => open(key, result.sealed, Buffer.from("wrong"))).to.throw();
  });

  it("should reject short key (hex)", () => {
    expect(() => seal("aabb", "test")).to.throw(/32 bytes/);
  });

  it("should reject short key (Uint8Array)", () => {
    expect(() => seal(new Uint8Array(16), "test")).to.throw(/32 bytes/);
  });

  it("should reject invalid hex key", () => {
    expect(() => seal("zz".repeat(32), "test")).to.throw(/Invalid hex/);
  });

  it("should reject too-short sealed box", () => {
    expect(() => open(key, "AAAA")).to.throw(/too short/);
  });

  it("should accept Uint8Array sealed input", () => {
    const result = seal(key, "bytes input");
    const raw = Buffer.from(result.sealed, "base64");
    const pt = open(key, raw);
    expect(Buffer.from(pt).toString("utf8")).to.equal("bytes input");
  });

  it("should handle empty plaintext", () => {
    const result = seal(key, "");
    const pt = open(key, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("");
  });
});
