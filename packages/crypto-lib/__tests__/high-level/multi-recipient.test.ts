import { expect } from "chai";
import {
  multiEncrypt,
  multiDecryptClassical,
  multiDecryptPQ,
} from "../../src/high-level/multi-recipient";
import { generateX25519KeyPair } from "../../src/modern/ecdh";
import { hybridKemKeygen } from "../../src/modern/pq-kem";

describe("Multi-Recipient Encryption", () => {
  it("should encrypt for a single classical recipient", () => {
    const alice = generateX25519KeyPair();
    const result = multiEncrypt(
      [{ type: "x25519", publicKey: alice.publicKey }],
      "Hello, Alice!",
    );
    expect(result.algorithm).to.equal("multi-recipient-secretbox");
    expect(result.recipients).to.have.length(1);
    expect(result.recipients[0]!.type).to.equal("x25519");

    const pt = multiDecryptClassical(
      alice.privateKey,
      result.recipients[0]!,
      result.ciphertext,
    );
    expect(Buffer.from(pt).toString("utf8")).to.equal("Hello, Alice!");
  });

  it("should encrypt for multiple classical recipients", () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const result = multiEncrypt(
      [
        { type: "x25519", publicKey: alice.publicKey },
        { type: "x25519", publicKey: bob.publicKey },
      ],
      "Hello, everyone!",
    );
    expect(result.recipients).to.have.length(2);

    const ptAlice = multiDecryptClassical(
      alice.privateKey,
      result.recipients[0]!,
      result.ciphertext,
    );
    const ptBob = multiDecryptClassical(
      bob.privateKey,
      result.recipients[1]!,
      result.ciphertext,
    );
    expect(Buffer.from(ptAlice).toString("utf8")).to.equal("Hello, everyone!");
    expect(Buffer.from(ptBob).toString("utf8")).to.equal("Hello, everyone!");
  });

  it("should encrypt for a PQ recipient", () => {
    const alice = hybridKemKeygen(768);
    const result = multiEncrypt(
      [
        {
          type: "x25519-ml-kem-768",
          x25519PublicKey: alice.x25519PublicKey,
          mlKemPublicKey: alice.mlKemPublicKey,
        },
      ],
      "Hello, PQ Alice!",
    );
    expect(result.recipients[0]!.type).to.equal("x25519-ml-kem-768");
    expect(result.recipients[0]!.mlKemCiphertext).to.be.a("string");

    const pt = multiDecryptPQ(
      alice.x25519PrivateKey,
      alice.mlKemSecretKey,
      result.recipients[0]!,
      result.ciphertext,
    );
    expect(Buffer.from(pt).toString("utf8")).to.equal("Hello, PQ Alice!");
  });

  it("should encrypt for mixed classical + PQ recipients", () => {
    const alice = generateX25519KeyPair();
    const bob = hybridKemKeygen(768);
    const result = multiEncrypt(
      [
        { type: "x25519", publicKey: alice.publicKey },
        {
          type: "x25519-ml-kem-768",
          x25519PublicKey: bob.x25519PublicKey,
          mlKemPublicKey: bob.mlKemPublicKey,
        },
      ],
      "Mixed recipients",
    );
    expect(result.recipients).to.have.length(2);

    const ptAlice = multiDecryptClassical(
      alice.privateKey,
      result.recipients[0]!,
      result.ciphertext,
    );
    const ptBob = multiDecryptPQ(
      bob.x25519PrivateKey,
      bob.mlKemSecretKey,
      result.recipients[1]!,
      result.ciphertext,
    );
    expect(Buffer.from(ptAlice).toString("utf8")).to.equal("Mixed recipients");
    expect(Buffer.from(ptBob).toString("utf8")).to.equal("Mixed recipients");
  });

  it("should reject empty recipients array", () => {
    expect(() => multiEncrypt([], "test")).to.throw(/At least one/);
  });

  it("should fail decryption with wrong classical key", () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const result = multiEncrypt(
      [{ type: "x25519", publicKey: alice.publicKey }],
      "secret",
    );
    expect(() =>
      multiDecryptClassical(
        bob.privateKey,
        result.recipients[0]!,
        result.ciphertext,
      ),
    ).to.throw();
  });

  it("should handle empty plaintext", () => {
    const alice = generateX25519KeyPair();
    const result = multiEncrypt(
      [{ type: "x25519", publicKey: alice.publicKey }],
      "",
    );
    const pt = multiDecryptClassical(
      alice.privateKey,
      result.recipients[0]!,
      result.ciphertext,
    );
    expect(Buffer.from(pt).toString("utf8")).to.equal("");
  });
});
