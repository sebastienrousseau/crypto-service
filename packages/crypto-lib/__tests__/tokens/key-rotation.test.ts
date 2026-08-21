import { expect } from "chai";
import {
  createKeyRing,
  rotateKey,
  findKeyByVersion,
  pruneExpiredKeys,
  encryptWithVersion,
  decryptWithVersion,
} from "../../src/tokens/key-rotation";
import type { VersionedKey } from "../../src/tokens/key-rotation";

describe("Key Rotation", () => {
  const key1: VersionedKey = {
    version: "v1",
    key: "aa".repeat(32),
    activatedAt: new Date("2025-01-01"),
  };

  const key2: VersionedKey = {
    version: "v2",
    key: "bb".repeat(32),
    activatedAt: new Date("2025-06-01"),
  };

  const key3: VersionedKey = {
    version: "v3",
    key: "cc".repeat(32),
    activatedAt: new Date("2026-01-01"),
  };

  it("should create a valid key ring", () => {
    const ring = createKeyRing(key1);
    expect(ring.current).to.deep.equal(key1);
    expect(ring.previous).to.deep.equal([]);
  });

  it("should rotate key — current moves to previous", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    expect(ring.current).to.deep.equal(key2);
    expect(ring.previous).to.have.length(1);
    expect(ring.previous[0]).to.deep.equal(key1);
  });

  it("should chain multiple rotations", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    ring = rotateKey(ring, key3);
    expect(ring.current).to.deep.equal(key3);
    expect(ring.previous).to.have.length(2);
    expect(ring.previous[0]).to.deep.equal(key1);
    expect(ring.previous[1]).to.deep.equal(key2);
  });

  it("should find current key by version", () => {
    const ring = createKeyRing(key1);
    const found = findKeyByVersion(ring, "v1");
    expect(found).to.deep.equal(key1);
  });

  it("should find previous key by version", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    const found = findKeyByVersion(ring, "v1");
    expect(found).to.deep.equal(key1);
  });

  it("should return undefined for unknown version", () => {
    const ring = createKeyRing(key1);
    const found = findKeyByVersion(ring, "v99");
    expect(found).to.be.undefined;
  });

  it("should prune expired keys", () => {
    const now = new Date("2025-07-01");
    const expired: VersionedKey = {
      ...key1,
      expiresAt: new Date("2025-06-15"),
    };
    let ring = createKeyRing(expired);
    ring = rotateKey(ring, key2);
    ring = pruneExpiredKeys(ring, now);
    expect(ring.previous).to.have.length(0);
    expect(ring.current).to.deep.equal(key2);
  });

  it("should not prune non-expired keys", () => {
    const now = new Date("2025-03-01");
    const future: VersionedKey = {
      ...key1,
      expiresAt: new Date("2025-12-01"),
    };
    let ring = createKeyRing(future);
    ring = rotateKey(ring, key2);
    ring = pruneExpiredKeys(ring, now);
    expect(ring.previous).to.have.length(1);
  });

  it("should not prune keys without expiresAt", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    ring = pruneExpiredKeys(ring, new Date("2099-01-01"));
    expect(ring.previous).to.have.length(1);
  });

  it("should use current time when no now is passed", () => {
    const longExpired: VersionedKey = {
      ...key1,
      expiresAt: new Date("2000-01-01"),
    };
    let ring = createKeyRing(longExpired);
    ring = rotateKey(ring, key2);
    ring = pruneExpiredKeys(ring);
    expect(ring.previous).to.have.length(0);
  });

  it("should encrypt with the current key version", () => {
    const ring = createKeyRing(key1);
    const { ciphertext, version } = encryptWithVersion(ring, "hello world");
    expect(ciphertext).to.be.a("string");
    expect(version).to.equal("v1");
  });

  it("should encrypt and decrypt round-trip", () => {
    const ring = createKeyRing(key1);
    const { ciphertext, version } = encryptWithVersion(ring, "secret data");
    const plaintext = decryptWithVersion(ring, ciphertext, version);
    expect(plaintext).to.equal("secret data");
  });

  it("should decrypt with rotated key (old version)", () => {
    let ring = createKeyRing(key1);
    const { ciphertext, version } = encryptWithVersion(ring, "old secret");
    expect(version).to.equal("v1");

    // Rotate to a new key
    ring = rotateKey(ring, key2);

    // Old ciphertext should still decrypt
    const plaintext = decryptWithVersion(ring, ciphertext, version);
    expect(plaintext).to.equal("old secret");
  });

  it("should decrypt with current key after rotation", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    const { ciphertext, version } = encryptWithVersion(ring, "new secret");
    expect(version).to.equal("v2");
    const plaintext = decryptWithVersion(ring, ciphertext, version);
    expect(plaintext).to.equal("new secret");
  });

  it("should throw on decrypt with unknown version", () => {
    const ring = createKeyRing(key1);
    expect(() => decryptWithVersion(ring, "irrelevant", "v99")).to.throw(
      /Key version "v99" not found/,
    );
  });

  it("should encrypt after multiple rotations using latest key", () => {
    let ring = createKeyRing(key1);
    ring = rotateKey(ring, key2);
    ring = rotateKey(ring, key3);
    const { version } = encryptWithVersion(ring, "latest");
    expect(version).to.equal("v3");
  });
});
