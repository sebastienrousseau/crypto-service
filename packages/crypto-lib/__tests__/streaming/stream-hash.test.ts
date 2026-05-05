import { expect } from "chai";
import { createHasher, STREAM_HASH_ALGORITHMS } from "../../src/streaming/stream-hash";
import { hash } from "../../src/modern/hash";

describe("Streaming Hash", () => {
  it("should produce same digest as one-shot hash for all algorithms", () => {
    for (const algo of STREAM_HASH_ALGORITHMS) {
      const oneShot = hash({ algorithm: algo, data: "hello world" });
      const streaming = createHasher(algo).update("hello ").update("world").digest();
      expect(streaming).to.equal(oneShot.digest, `mismatch for ${algo}`);
    }
  });

  it("should accept Uint8Array input", () => {
    const h = createHasher("sha256");
    h.update(Buffer.from("test", "utf8"));
    const digest = h.digest();
    expect(digest).to.be.a("string").with.length(64);
  });

  it("should support digestBytes()", () => {
    const bytes = createHasher("sha256").update("test").digestBytes();
    expect(bytes).to.be.instanceOf(Uint8Array);
    expect(bytes.length).to.equal(32);
  });

  it("should throw after finalization", () => {
    const h = createHasher("sha256");
    h.update("data");
    h.digest();
    expect(() => h.update("more")).to.throw(/finalized/);
  });

  it("should reject unsupported algorithm", () => {
    expect(() => createHasher("md5" as any)).to.throw(/Unsupported/);
  });

  it("should handle empty input", () => {
    const digest = createHasher("sha256").update("").digest();
    const expected = hash({ algorithm: "sha256", data: "" }).digest;
    expect(digest).to.equal(expected);
  });

  it("should handle many small updates", () => {
    const h = createHasher("blake3");
    for (let i = 0; i < 100; i++) {
      h.update(String(i));
    }
    const digest = h.digest();
    expect(digest).to.be.a("string");
    expect(digest.length).to.be.greaterThan(0);
  });
});
