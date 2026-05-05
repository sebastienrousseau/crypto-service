import { expect } from "chai";
import { seal, open, sealPQ, openPQ } from "../../src/high-level/sealedbox";
import { generateX25519KeyPair } from "../../src/modern/ecdh";
import { hybridKemKeygen } from "../../src/modern/pq-kem";

describe("Sealed Box", () => {
  it("should encrypt and decrypt anonymously", () => {
    const kp = generateX25519KeyPair();
    const result = seal(kp.publicKey, "Hello, Sealed Box!");
    expect(result.algorithm).to.equal("x25519-xchacha20-poly1305");

    const pt = open(kp.privateKey, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("Hello, Sealed Box!");
  });

  it("should produce different ciphertexts (ephemeral keys)", () => {
    const kp = generateX25519KeyPair();
    const r1 = seal(kp.publicKey, "same");
    const r2 = seal(kp.publicKey, "same");
    expect(r1.sealed).to.not.equal(r2.sealed);
  });

  it("should fail with wrong recipient key", () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const result = seal(alice.publicKey, "for alice");
    expect(() => open(bob.privateKey, result.sealed)).to.throw();
  });

  it("should accept Uint8Array inputs", () => {
    const kp = generateX25519KeyPair();
    const pubBytes = Buffer.from(kp.publicKey, "hex");
    const privBytes = Buffer.from(kp.privateKey, "hex");
    const result = seal(pubBytes, Buffer.from("bytes", "utf8"));
    const pt = open(privBytes, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("bytes");
  });

  it("should reject too-short sealed box", () => {
    const kp = generateX25519KeyPair();
    expect(() => open(kp.privateKey, "AAAA")).to.throw(/too short/);
  });

  it("should reject invalid hex public key", () => {
    expect(() => seal("zzzz", "test")).to.throw(/Invalid hex/);
  });

  it("should handle empty plaintext", () => {
    const kp = generateX25519KeyPair();
    const result = seal(kp.publicKey, "");
    const pt = open(kp.privateKey, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("");
  });

  it("should accept Uint8Array sealed input for open", () => {
    const kp = generateX25519KeyPair();
    const result = seal(kp.publicKey, "raw bytes sealed");
    const rawSealed = Buffer.from(result.sealed, "base64");
    const pt = open(kp.privateKey, rawSealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("raw bytes sealed");
  });

  it("should handle large plaintext", () => {
    const kp = generateX25519KeyPair();
    const big = "A".repeat(100000);
    const result = seal(kp.publicKey, big);
    const pt = open(kp.privateKey, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal(big);
  });
});

describe("PQ Sealed Box (X25519 + ML-KEM-768)", () => {
  it("should encrypt and decrypt with hybrid PQ keys", () => {
    const kp = hybridKemKeygen(768);
    const result = sealPQ(
      kp.x25519PublicKey,
      kp.mlKemPublicKey,
      "Hello, PQ Sealed Box!",
    );
    expect(result.algorithm).to.equal("x25519-ml-kem-768-xchacha20-poly1305");

    const pt = openPQ(
      kp.x25519PrivateKey,
      kp.mlKemSecretKey,
      result.sealed,
    );
    expect(Buffer.from(pt).toString("utf8")).to.equal("Hello, PQ Sealed Box!");
  });

  it("should produce different ciphertexts (ephemeral keys)", () => {
    const kp = hybridKemKeygen(768);
    const r1 = sealPQ(kp.x25519PublicKey, kp.mlKemPublicKey, "same");
    const r2 = sealPQ(kp.x25519PublicKey, kp.mlKemPublicKey, "same");
    expect(r1.sealed).to.not.equal(r2.sealed);
  });

  it("should fail with wrong recipient keys", () => {
    const alice = hybridKemKeygen(768);
    const bob = hybridKemKeygen(768);
    const result = sealPQ(
      alice.x25519PublicKey,
      alice.mlKemPublicKey,
      "for alice",
    );
    expect(() =>
      openPQ(bob.x25519PrivateKey, bob.mlKemSecretKey, result.sealed),
    ).to.throw();
  });

  it("should handle empty plaintext", () => {
    const kp = hybridKemKeygen(768);
    const result = sealPQ(kp.x25519PublicKey, kp.mlKemPublicKey, "");
    const pt = openPQ(kp.x25519PrivateKey, kp.mlKemSecretKey, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("");
  });

  it("should reject too-short sealed box", () => {
    const kp = hybridKemKeygen(768);
    expect(() =>
      openPQ(kp.x25519PrivateKey, kp.mlKemSecretKey, "AAAA"),
    ).to.throw(/too short/);
  });

  it("should accept Uint8Array inputs", () => {
    const kp = hybridKemKeygen(768);
    const x25519PubBytes = Buffer.from(kp.x25519PublicKey, "hex");
    const mlKemPubBytes = Buffer.from(kp.mlKemPublicKey, "hex");
    const x25519SecBytes = Buffer.from(kp.x25519PrivateKey, "hex");
    const mlKemSecBytes = Buffer.from(kp.mlKemSecretKey, "hex");

    const result = sealPQ(x25519PubBytes, mlKemPubBytes, "bytes input");
    const pt = openPQ(x25519SecBytes, mlKemSecBytes, result.sealed);
    expect(Buffer.from(pt).toString("utf8")).to.equal("bytes input");
  });
});
