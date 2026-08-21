import { expect } from "chai";
import {
  generateKeyPair,
  KEY_ALGORITHMS,
  KeyAlgorithm,
} from "../../src/keys/keygen";

describe("Unified Key Generation", () => {
  const HEX_RE = /^[0-9a-f]+$/;

  for (const algo of KEY_ALGORITHMS) {
    it(`should generate a key pair for ${algo}`, () => {
      const kp = generateKeyPair(algo);
      expect(kp.algorithm).to.equal(algo);
      expect(kp.publicKey).to.match(HEX_RE);
      expect(kp.privateKey).to.match(HEX_RE);
      expect(kp.kid).to.be.a("string");
      expect(kp.kid.length).to.be.greaterThan(0);
    });
  }

  it("should generate unique key IDs", () => {
    const kp1 = generateKeyPair("ed25519");
    const kp2 = generateKeyPair("ed25519");
    expect(kp1.kid).to.not.equal(kp2.kid);
  });

  it("should use custom kid from metadata", () => {
    const kp = generateKeyPair("ed25519", { kid: "my-key-id" });
    expect(kp.kid).to.equal("my-key-id");
    expect(kp.metadata.kid).to.equal("my-key-id");
  });

  it("should pass through use and exp metadata", () => {
    const kp = generateKeyPair("ed25519", {
      use: "sig",
      exp: "2027-01-01",
    });
    expect(kp.metadata.use).to.equal("sig");
    expect(kp.metadata.exp).to.equal("2027-01-01");
  });

  it("should throw for unsupported algorithm", () => {
    expect(() => generateKeyPair("rsa-2048" as KeyAlgorithm)).to.throw(
      /Unsupported/,
    );
  });

  describe("key sizes", () => {
    it("ed25519: 32-byte private, 32-byte public", () => {
      const kp = generateKeyPair("ed25519");
      expect(kp.privateKey).to.have.length(64);
      expect(kp.publicKey).to.have.length(64);
    });

    it("x25519: 32-byte private, 32-byte public", () => {
      const kp = generateKeyPair("x25519");
      expect(kp.privateKey).to.have.length(64);
      expect(kp.publicKey).to.have.length(64);
    });

    it("p256: 32-byte private", () => {
      const kp = generateKeyPair("p256");
      expect(kp.privateKey).to.have.length(64);
      // p256 public key is 33 bytes (compressed) or 65 bytes (uncompressed)
      expect(kp.publicKey.length).to.be.greaterThan(0);
    });
  });

  it("KEY_ALGORITHMS should list all 12 algorithms", () => {
    expect(KEY_ALGORITHMS).to.have.length(12);
    expect(KEY_ALGORITHMS).to.include("ed25519");
    expect(KEY_ALGORITHMS).to.include("ml-kem-768");
    expect(KEY_ALGORITHMS).to.include("ml-dsa-65");
  });
});
