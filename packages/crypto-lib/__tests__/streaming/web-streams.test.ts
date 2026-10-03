import { expect } from "chai";
import {
  createEncryptStream,
  createDecryptStream,
  createPqEncryptStream,
  createPqDecryptStream,
  createHashStream,
  WEB_STREAM_HASH_ALGORITHMS,
} from "../../src/streaming/web-streams";
import type {
  HashStreamResult,
  WebStreamHashAlgorithm,
} from "../../src/streaming/web-streams";
import { hash } from "../../src/modern/hash";
import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { randomBytes } from "@noble/ciphers/utils.js";

/**
 * Helper: pipe Uint8Array chunks through a TransformStream, reading and
 * writing concurrently to avoid deadlocks from backpressure.
 */
async function pipeThrough<T>(
  inputChunks: Uint8Array[],
  stream: { writable: WritableStream<Uint8Array>; readable: ReadableStream<T> },
): Promise<T[]> {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const results: T[] = [];

  // Read and write concurrently to prevent backpressure deadlocks.
  const writePromise = (async () => {
    for (const chunk of inputChunks) {
      await writer.write(chunk);
    }
    await writer.close();
  })();

  const readPromise = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      results.push(value);
    }
  })();

  await Promise.all([writePromise, readPromise]);
  return results;
}

/** Helper: encrypt data and return concatenated ciphertext. */
async function collectEncrypt(
  input: Uint8Array,
  key: string | Uint8Array,
): Promise<Uint8Array> {
  const stream = createEncryptStream({ key });
  const chunks = await pipeThrough<Uint8Array>([input], stream);
  return Buffer.concat(chunks);
}

/** Helper: decrypt ciphertext and return plaintext. */
async function collectDecrypt(
  input: Uint8Array,
  key: string | Uint8Array,
): Promise<Uint8Array> {
  const stream = createDecryptStream({ key });
  const chunks = await pipeThrough<Uint8Array>([input], stream);
  return Buffer.concat(chunks);
}

/** Helper: hash chunks and return the result. */
async function collectHash(
  inputChunks: Uint8Array[],
  algorithm: WebStreamHashAlgorithm,
): Promise<HashStreamResult> {
  const stream = createHashStream(algorithm);
  const results = await pipeThrough<HashStreamResult>(inputChunks, stream);
  return results[0]!;
}

describe("Web Streams", () => {
  const key = "aa".repeat(32); // 256-bit hex key

  describe("createEncryptStream + createDecryptStream", () => {
    it("should round-trip small data", async () => {
      const plaintext = Buffer.from("Hello, Web Streams!");
      const ciphertext = await collectEncrypt(plaintext, key);
      expect(ciphertext.length).to.be.greaterThan(plaintext.length);
      const decrypted = await collectDecrypt(ciphertext, key);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal(
        "Hello, Web Streams!",
      );
    });

    it("should round-trip empty data", async () => {
      const plaintext = new Uint8Array(0);
      const ciphertext = await collectEncrypt(plaintext, key);
      const decrypted = await collectDecrypt(ciphertext, key);
      expect(decrypted.length).to.equal(0);
    });

    it("should round-trip larger data", async () => {
      const plaintext = new Uint8Array(4096);
      for (let i = 0; i < plaintext.length; i++) {
        plaintext[i] = i & 0xff;
      }
      const ciphertext = await collectEncrypt(plaintext, key);
      const decrypted = await collectDecrypt(ciphertext, key);
      expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
    });

    it("should accept hex string key", async () => {
      const hexKey = "bb".repeat(32);
      const plaintext = Buffer.from("hex key test");
      const ciphertext = await collectEncrypt(plaintext, hexKey);
      const decrypted = await collectDecrypt(ciphertext, hexKey);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("hex key test");
    });

    it("should accept Uint8Array key", async () => {
      const keyBytes = new Uint8Array(32).fill(0xdd);
      const plaintext = Buffer.from("bytes key test");
      const ciphertext = await collectEncrypt(plaintext, keyBytes);
      const decrypted = await collectDecrypt(ciphertext, keyBytes);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal(
        "bytes key test",
      );
    });

    it("should fail decryption with wrong key", async () => {
      const plaintext = Buffer.from("secret data");
      const ciphertext = await collectEncrypt(plaintext, key);
      const wrongKey = "cc".repeat(32);
      try {
        await collectDecrypt(ciphertext, wrongKey);
        expect.fail("Expected decryption to fail");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("should fail with tampered ciphertext", async () => {
      const plaintext = Buffer.from("tamper test");
      const ciphertext = await collectEncrypt(plaintext, key);
      // Tamper with a byte after the nonce
      ciphertext[30] ^= 0xff;
      try {
        await collectDecrypt(ciphertext, key);
        expect.fail("Expected decryption to fail");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("should reject too-short ciphertext", async () => {
      try {
        await collectDecrypt(new Uint8Array(10), key);
        expect.fail("Expected an error");
      } catch (err) {
        expect((err as Error).message).to.match(/too short/i);
      }
    });

    it("should reject invalid key length (hex)", () => {
      expect(() => createEncryptStream({ key: "aa".repeat(16) })).to.throw(
        /32 bytes/,
      );
    });

    it("should reject invalid key length (Uint8Array)", () => {
      expect(() => createEncryptStream({ key: new Uint8Array(16) })).to.throw(
        /32 bytes/,
      );
    });

    it("should reject invalid hex key", () => {
      expect(() => createEncryptStream({ key: "zzzz" })).to.throw(
        /Invalid hex/,
      );
    });

    it("should reject invalid key on decrypt stream creation", () => {
      expect(() => createDecryptStream({ key: "aa".repeat(16) })).to.throw(
        /32 bytes/,
      );
    });

    it("should round-trip with multiple write chunks", async () => {
      const encStream = createEncryptStream({ key });
      const encChunks = await pipeThrough<Uint8Array>(
        [Buffer.from("chunk1"), Buffer.from("chunk2"), Buffer.from("chunk3")],
        encStream,
      );
      const ciphertext = Buffer.concat(encChunks);

      const decrypted = await collectDecrypt(ciphertext, key);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal(
        "chunk1chunk2chunk3",
      );
    });
  });

  describe("createHashStream", () => {
    it("should produce correct sha256 digest", async () => {
      const data = Buffer.from("hello world");
      const result = await collectHash([data], "sha256");
      const expected = hash({ algorithm: "sha256", data: "hello world" });
      expect(result.digest).to.equal(expected.digest);
      expect(result.algorithm).to.equal("sha256");
    });

    it("should produce correct blake3 digest", async () => {
      const data = Buffer.from("hello world");
      const result = await collectHash([data], "blake3");
      const expected = hash({ algorithm: "blake3", data: "hello world" });
      expect(result.digest).to.equal(expected.digest);
      expect(result.algorithm).to.equal("blake3");
    });

    it("should handle multiple chunks", async () => {
      const chunk1 = Buffer.from("hello ");
      const chunk2 = Buffer.from("world");
      const result = await collectHash([chunk1, chunk2], "sha256");
      const expected = hash({ algorithm: "sha256", data: "hello world" });
      expect(result.digest).to.equal(expected.digest);
    });

    it("should handle empty input", async () => {
      const result = await collectHash([new Uint8Array(0)], "sha256");
      const expected = hash({ algorithm: "sha256", data: "" });
      expect(result.digest).to.equal(expected.digest);
    });

    it("should produce non-empty digests for all supported algorithms", async () => {
      for (const algo of WEB_STREAM_HASH_ALGORITHMS) {
        const data = Buffer.from("test data");
        const result = await collectHash([data], algo);
        expect(result.digest).to.be.a("string");
        expect(result.digest.length).to.be.greaterThan(0);
        expect(result.algorithm).to.equal(algo);
      }
    });

    it("should reject unsupported algorithm", () => {
      expect(() => createHashStream("md5" as never)).to.throw(/Unsupported/);
    });
  });

  describe("createPqEncryptStream + createPqDecryptStream", () => {
    const x25519Priv = randomBytes(32);
    const x25519Pub = x25519.getPublicKey(x25519Priv);
    const { publicKey: mlKemPub, secretKey: mlKemPriv } = ml_kem768.keygen();

    const x25519PubHex = Buffer.from(x25519Pub).toString("hex");
    const mlKemPubHex = Buffer.from(mlKemPub).toString("hex");
    const x25519PrivHex = Buffer.from(x25519Priv).toString("hex");
    const mlKemPrivHex = Buffer.from(mlKemPriv).toString("hex");

    it("should round-trip small data with hex keys", async () => {
      const encStream = createPqEncryptStream({
        recipientX25519Public: x25519PubHex,
        recipientMlKemPublic: mlKemPubHex,
      });
      const input = [Buffer.from("Hello, Post-Quantum Web Streams!")];
      const encChunks = await pipeThrough<Uint8Array>(input, encStream);
      const ciphertext = Buffer.concat(encChunks);

      const decStream = createPqDecryptStream({
        recipientX25519Secret: x25519PrivHex,
        recipientMlKemSecret: mlKemPrivHex,
      });
      const decChunks = await pipeThrough<Uint8Array>([ciphertext], decStream);
      const decrypted = Buffer.concat(decChunks);
      expect(decrypted.toString("utf8")).to.equal(
        "Hello, Post-Quantum Web Streams!",
      );
    });

    it("should round-trip empty data", async () => {
      const encStream = createPqEncryptStream({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
      });
      const encChunks = await pipeThrough<Uint8Array>(
        [new Uint8Array(0)],
        encStream,
      );
      const ciphertext = Buffer.concat(encChunks);

      const decStream = createPqDecryptStream({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
      });
      const decChunks = await pipeThrough<Uint8Array>([ciphertext], decStream);
      const decrypted = Buffer.concat(decChunks);
      expect(decrypted.length).to.equal(0);
    });

    it("should round-trip multi-chunk data with custom chunk size", async () => {
      const chunkSize = 128;
      const encStream = createPqEncryptStream({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        chunkSize,
      });
      const inputChunks = [
        Buffer.from("First chunk of stream data. "),
        Buffer.from("Second chunk of stream data. "),
        Buffer.from("Third chunk completing the stream."),
      ];
      const totalExpected = Buffer.concat(inputChunks);

      const encChunks = await pipeThrough<Uint8Array>(inputChunks, encStream);
      const ciphertext = Buffer.concat(encChunks);

      const decStream = createPqDecryptStream({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
        chunkSize,
      });
      const decChunks = await pipeThrough<Uint8Array>([ciphertext], decStream);
      const decrypted = Buffer.concat(decChunks);
      expect(decrypted).to.deep.equal(totalExpected);
    });

    it("should fail decryption on tampered ciphertext", async () => {
      const encStream = createPqEncryptStream({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
      });
      const encChunks = await pipeThrough<Uint8Array>(
        [Buffer.from("Sensitive PQ Payload")],
        encStream,
      );
      const ciphertext = Buffer.concat(encChunks);
      ciphertext[ciphertext.length - 1] ^= 0xff;

      const decStream = createPqDecryptStream({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
      });
      try {
        await pipeThrough<Uint8Array>([ciphertext], decStream);
        expect.fail("Expected decryption to fail");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("should fail decryption with wrong secret key", async () => {
      const encStream = createPqEncryptStream({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
      });
      const encChunks = await pipeThrough<Uint8Array>(
        [Buffer.from("Secret PQ Payload")],
        encStream,
      );
      const ciphertext = Buffer.concat(encChunks);

      const wrongX25519Priv = randomBytes(32);
      const decStream = createPqDecryptStream({
        recipientX25519Secret: wrongX25519Priv,
        recipientMlKemSecret: mlKemPriv,
      });
      try {
        await pipeThrough<Uint8Array>([ciphertext], decStream);
        expect.fail("Expected decryption to fail");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
  });
});
