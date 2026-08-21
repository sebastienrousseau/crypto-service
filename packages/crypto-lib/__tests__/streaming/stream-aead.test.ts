import { expect } from "chai";
import {
  streamEncrypt,
  streamDecrypt,
} from "../../src/streaming/stream-aead";

describe("Streaming AEAD", () => {
  const key = "aa".repeat(32); // 256-bit key

  it("should encrypt and decrypt small data (single chunk)", () => {
    const plaintext = Buffer.from("Hello, streaming AEAD!");
    const encrypted = streamEncrypt({ key, plaintext });
    expect(encrypted.algorithm).to.equal("xchacha20-poly1305-stream");
    expect(encrypted.ciphertext.length).to.be.greaterThan(plaintext.length);

    const decrypted = streamDecrypt({ key, ciphertext: encrypted.ciphertext });
    expect(Buffer.from(decrypted).toString("utf8")).to.equal(
      "Hello, streaming AEAD!",
    );
  });

  it("should encrypt and decrypt empty data", () => {
    const plaintext = new Uint8Array(0);
    const encrypted = streamEncrypt({ key, plaintext });
    const decrypted = streamDecrypt({ key, ciphertext: encrypted.ciphertext });
    expect(decrypted.length).to.equal(0);
  });

  it("should encrypt and decrypt multi-chunk data", () => {
    const chunkSize = 64; // small chunks for testing
    const plaintext = new Uint8Array(200).fill(0x42);
    const encrypted = streamEncrypt({ key, plaintext, chunkSize });
    const decrypted = streamDecrypt({
      key,
      ciphertext: encrypted.ciphertext,
      chunkSize,
    });
    expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
  });

  it("should encrypt and decrypt data exactly one chunk", () => {
    const chunkSize = 100;
    const plaintext = new Uint8Array(100).fill(0xaa);
    const encrypted = streamEncrypt({ key, plaintext, chunkSize });
    const decrypted = streamDecrypt({
      key,
      ciphertext: encrypted.ciphertext,
      chunkSize,
    });
    expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
  });

  it("should fail decryption with wrong key", () => {
    const plaintext = Buffer.from("secret");
    const encrypted = streamEncrypt({ key, plaintext });
    const wrongKey = "bb".repeat(32);
    expect(() =>
      streamDecrypt({ key: wrongKey, ciphertext: encrypted.ciphertext }),
    ).to.throw();
  });

  it("should fail on tampered ciphertext", () => {
    const plaintext = Buffer.from("tamper test");
    const encrypted = streamEncrypt({ key, plaintext });
    // Tamper with a byte in the ciphertext (after the header)
    encrypted.ciphertext[30] ^= 0xff;
    expect(() =>
      streamDecrypt({ key, ciphertext: encrypted.ciphertext }),
    ).to.throw();
  });

  it("should reject too-short ciphertext", () => {
    expect(() =>
      streamDecrypt({ key, ciphertext: new Uint8Array(10) }),
    ).to.throw(/too short/);
  });

  it("should reject invalid key length", () => {
    expect(() =>
      streamEncrypt({
        key: "aa".repeat(16),
        plaintext: new Uint8Array(10),
      }),
    ).to.throw(/32 bytes/);
  });

  it("should accept Uint8Array key", () => {
    const keyBytes = new Uint8Array(32).fill(0xdd);
    const plaintext = Buffer.from("bytes key test");
    const encrypted = streamEncrypt({ key: keyBytes, plaintext });
    const decrypted = streamDecrypt({
      key: keyBytes,
      ciphertext: encrypted.ciphertext,
    });
    expect(Buffer.from(decrypted).toString("utf8")).to.equal("bytes key test");
  });

  it("should reject invalid chunk tag", () => {
    const plaintext = Buffer.from("tag test");
    const encrypted = streamEncrypt({ key, plaintext });
    // Set chunk tag byte (at offset 24, after the nonce header) to invalid value
    encrypted.ciphertext[24] = 0xff;
    expect(() =>
      streamDecrypt({ key, ciphertext: encrypted.ciphertext }),
    ).to.throw(/Invalid chunk tag/);
  });

  it("should reject truncated multi-chunk ciphertext", () => {
    const chunkSize = 32;
    const plaintext = new Uint8Array(100).fill(0x42);
    const encrypted = streamEncrypt({ key, plaintext, chunkSize });
    // Truncate the ciphertext mid-chunk
    const truncated = encrypted.ciphertext.subarray(0, 70);
    expect(() =>
      streamDecrypt({ key, ciphertext: truncated, chunkSize }),
    ).to.throw();
  });

  it("should reject invalid hex key", () => {
    expect(() =>
      streamEncrypt({ key: "zzzz", plaintext: new Uint8Array(10) }),
    ).to.throw(/Invalid hex/);
  });

  it("should reject wrong-length Uint8Array key", () => {
    expect(() =>
      streamEncrypt({
        key: new Uint8Array(16),
        plaintext: new Uint8Array(10),
      }),
    ).to.throw(/32 bytes/);
  });

  it("should handle large data (128 KiB)", () => {
    const plaintext = new Uint8Array(128 * 1024);
    for (let i = 0; i < plaintext.length; i++) {
      plaintext[i] = i & 0xff;
    }
    const encrypted = streamEncrypt({ key, plaintext });
    const decrypted = streamDecrypt({ key, ciphertext: encrypted.ciphertext });
    expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
  });
});
