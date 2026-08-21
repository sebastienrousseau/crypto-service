import { expect } from "chai";
import { Keyring } from "../../src/keys/keyring";

describe("Keyring", () => {
  it("should add and retrieve a key", () => {
    const ring = new Keyring();
    const entry = ring.add("ed25519", { use: "sig" });
    expect(entry.algorithm).to.equal("ed25519");
    expect(entry.use).to.equal("sig");
    expect(entry.archived).to.be.false;
    expect(ring.size).to.equal(1);

    const found = ring.get(entry.kid);
    expect(found).to.deep.equal(entry);
  });

  it("should list keys with filters", () => {
    const ring = new Keyring();
    ring.add("ed25519", { use: "sig" });
    ring.add("x25519", { use: "enc" });
    ring.add("ed25519", { use: "sig" });

    expect(ring.list()).to.have.length(3);
    expect(ring.list({ algorithm: "ed25519" })).to.have.length(2);
    expect(ring.list({ use: "enc" })).to.have.length(1);
    expect(ring.list({ algorithm: "p256" })).to.have.length(0);
  });

  it("should delete a key", () => {
    const ring = new Keyring();
    const entry = ring.add("ed25519");
    expect(ring.size).to.equal(1);
    expect(ring.delete(entry.kid)).to.be.true;
    expect(ring.size).to.equal(0);
    expect(ring.get(entry.kid)).to.be.undefined;
  });

  it("should return false when deleting non-existent key", () => {
    const ring = new Keyring();
    expect(ring.delete("nonexistent")).to.be.false;
  });

  it("should rotate a key", () => {
    const ring = new Keyring();
    const original = ring.add("ed25519", { use: "sig" });
    const rotated = ring.rotate(original.kid);

    expect(rotated.algorithm).to.equal("ed25519");
    expect(rotated.use).to.equal("sig");
    expect(rotated.kid).to.not.equal(original.kid);

    // Original should be archived
    const oldEntry = ring.get(original.kid);
    expect(oldEntry!.archived).to.be.true;

    // Archived keys excluded by default
    expect(ring.list()).to.have.length(1);
    expect(ring.list({ includeArchived: true })).to.have.length(2);
  });

  it("should throw when rotating non-existent key", () => {
    const ring = new Keyring();
    expect(() => ring.rotate("nonexistent")).to.throw(/not found/);
  });

  it("should import a key entry", () => {
    const ring = new Keyring();
    const entry = ring.add("ed25519");
    const ring2 = new Keyring();
    ring2.import(entry);
    expect(ring2.get(entry.kid)).to.deep.equal(entry);
  });

  it("should serialize and deserialize", () => {
    const ring = new Keyring();
    ring.add("ed25519", { use: "sig" });
    ring.add("x25519", { use: "enc" });

    const json = ring.serialize();
    const restored = Keyring.deserialize(json);
    expect(restored.size).to.equal(2);
    expect(restored.list()).to.have.length(2);
  });

  it("should encrypt and decrypt the keyring", () => {
    const ring = new Keyring();
    ring.add("ed25519", { use: "sig" });
    ring.add("x25519", { use: "enc" });

    const key = "aa".repeat(32); // 256-bit key
    const encrypted = ring.toEncrypted(key);
    expect(encrypted).to.be.a("string");

    const restored = Keyring.fromEncrypted(key, encrypted);
    expect(restored.size).to.equal(2);
    expect(restored.list()).to.have.length(2);
  });

  it("should fail decryption with wrong key", () => {
    const ring = new Keyring();
    ring.add("ed25519");

    const encrypted = ring.toEncrypted("aa".repeat(32));
    expect(() => Keyring.fromEncrypted("bb".repeat(32), encrypted)).to.throw();
  });

  it("should export JWKS for Ed25519 and X25519 keys", () => {
    const ring = new Keyring();
    ring.add("ed25519", { use: "sig" });
    ring.add("x25519", { use: "enc" });
    ring.add("p256", { use: "sig" }); // not supported in JWKS export

    const jwks = ring.toJwks();
    expect(jwks.keys).to.have.length(2);
    expect(jwks.keys[0]!.kty).to.equal("OKP");
    expect(jwks.keys[0]!.crv).to.equal("Ed25519");
    expect(jwks.keys[1]!.kty).to.equal("OKP");
    expect(jwks.keys[1]!.crv).to.equal("X25519");
  });

  it("should exclude archived keys from JWKS", () => {
    const ring = new Keyring();
    const entry = ring.add("ed25519");
    ring.rotate(entry.kid);

    const jwks = ring.toJwks();
    expect(jwks.keys).to.have.length(1);
  });
});
