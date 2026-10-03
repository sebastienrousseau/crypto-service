/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import {
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
  MULTI_PQ_STREAM_MAGIC,
  MULTI_PQ_STREAM_VERSION,
  MULTI_PQ_PREFIX_LEN,
  type MultiPqRecipient,
} from "../../src/streaming/stream-multi-pq-aead";
import {
  createMultiPqEncryptStream,
  createMultiPqDecryptStream,
} from "../../src/streaming/web-streams";

describe("Multi-Recipient Post-Quantum Streaming AEAD", () => {
  // Generate 3 test recipients
  function makeRecipient(id: string) {
    const xPriv = randomBytes(32);
    const xPub = x25519.getPublicKey(xPriv);
    const { publicKey: mlPub, secretKey: mlPriv } = ml_kem768.keygen();
    return {
      id,
      xPriv,
      xPub,
      mlPriv,
      mlPub,
      xPubHex: Buffer.from(xPub).toString("hex"),
      mlPubHex: Buffer.from(mlPub).toString("hex"),
      xPrivHex: Buffer.from(xPriv).toString("hex"),
      mlPrivHex: Buffer.from(mlPriv).toString("hex"),
    };
  }

  const alice = makeRecipient("alice@example.com");
  const bob = makeRecipient("bob@example.com");
  const charlie = makeRecipient("charlie@example.com");
  const mallory = makeRecipient("mallory@example.com");

  const recipients: MultiPqRecipient[] = [
    {
      recipientId: alice.id,
      recipientX25519Public: alice.xPubHex,
      recipientMlKemPublic: alice.mlPubHex,
    },
    {
      recipientId: bob.id,
      recipientX25519Public: bob.xPub,
      recipientMlKemPublic: bob.mlPub,
    },
    {
      recipientId: charlie.id,
      recipientX25519Public: charlie.xPubHex,
      recipientMlKemPublic: charlie.mlPubHex,
    },
  ];

  describe("End-to-End Multi-Recipient Encryption and Decryption", () => {
    it("should allow every recipient to decrypt the stream independently", () => {
      const plaintext = new TextEncoder().encode(
        "Quantum-resistant confidential message for multiple distributed services.",
      );

      const encResult = streamMultiPqEncrypt({
        recipients,
        plaintext,
      });

      expect(encResult.recipientCount).to.equal(3);
      expect(encResult.algorithm).to.equal(
        "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
      );
      expect(encResult.ciphertext).to.be.instanceOf(Uint8Array);
      expect(encResult.ciphertext.subarray(0, 4)).to.deep.equal(
        MULTI_PQ_STREAM_MAGIC,
      );
      expect(encResult.ciphertext[4]).to.equal(MULTI_PQ_STREAM_VERSION);

      // Decrypt as Alice (using hex keys)
      const decAlice = streamMultiPqDecrypt({
        recipientId: alice.id,
        recipientX25519Secret: alice.xPrivHex,
        recipientMlKemSecret: alice.mlPrivHex,
        ciphertext: encResult.ciphertext,
      });
      expect(decAlice.recipientId).to.equal(alice.id);
      expect(new TextDecoder().decode(decAlice.plaintext)).to.equal(
        "Quantum-resistant confidential message for multiple distributed services.",
      );

      // Decrypt as Bob (without explicit recipientId - auto-detection)
      const decBob = streamMultiPqDecrypt({
        recipientX25519Secret: bob.xPriv,
        recipientMlKemSecret: bob.mlPriv,
        ciphertext: encResult.ciphertext,
      });
      expect(decBob.recipientId).to.equal(bob.id);
      expect(new TextDecoder().decode(decBob.plaintext)).to.equal(
        "Quantum-resistant confidential message for multiple distributed services.",
      );

      // Decrypt as Charlie
      const decCharlie = streamMultiPqDecrypt({
        recipientId: charlie.id,
        recipientX25519Secret: charlie.xPrivHex,
        recipientMlKemSecret: charlie.mlPrivHex,
        ciphertext: encResult.ciphertext,
      });
      expect(decCharlie.recipientId).to.equal(charlie.id);
      expect(decCharlie.plaintext).to.deep.equal(plaintext);
    });

    it("should encrypt and decrypt empty (zero-length) plaintext payload", () => {
      const plaintext = new Uint8Array(0);
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext,
      });

      const decResult = streamMultiPqDecrypt({
        recipientX25519Secret: alice.xPriv,
        recipientMlKemSecret: alice.mlPriv,
        ciphertext: encResult.ciphertext,
      });
      expect(decResult.plaintext.length).to.equal(0);
      expect(decResult.recipientId).to.equal(alice.id);
    });

    it("should handle multi-chunk stream payload with custom chunk size", () => {
      // 5000 bytes with 1024-byte chunkSize -> 5 chunks
      const plaintext = randomBytes(5000);
      const chunkSize = 1024;

      const encResult = streamMultiPqEncrypt({
        recipients,
        plaintext,
        chunkSize,
      });

      const decResult = streamMultiPqDecrypt({
        recipientId: bob.id,
        recipientX25519Secret: bob.xPriv,
        recipientMlKemSecret: bob.mlPriv,
        ciphertext: encResult.ciphertext,
      });

      expect(decResult.plaintext).to.deep.equal(plaintext);
    });

    it("should encrypt and decrypt data that matches exact multiple of chunkSize", () => {
      const plaintext = randomBytes(2048);
      const chunkSize = 1024;

      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext,
        chunkSize,
      });

      const decResult = streamMultiPqDecrypt({
        recipientId: alice.id,
        recipientX25519Secret: alice.xPriv,
        recipientMlKemSecret: alice.mlPriv,
        ciphertext: encResult.ciphertext,
        chunkSize,
      });

      expect(decResult.plaintext).to.deep.equal(plaintext);
    });
  });

  async function pipeThrough<T>(
    inputChunks: Uint8Array[],
    stream: {
      writable: WritableStream<Uint8Array>;
      readable: ReadableStream<T>;
    },
  ): Promise<T[]> {
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const results: T[] = [];

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

  describe("TransformStream Web Streams Integration", () => {
    it("should stream encrypt and decrypt across WHATWG TransformStream pipelines", async () => {
      const testData = new TextEncoder().encode(
        "Web Stream Pipeline Integration across Edge Runtimes",
      );

      const encStream = createMultiPqEncryptStream({
        recipients: [
          recipients[0] as MultiPqRecipient,
          recipients[1] as MultiPqRecipient,
        ],
        chunkSize: 1024,
      });

      const inputChunks = [testData.subarray(0, 20), testData.subarray(20)];
      const encChunks = await pipeThrough<Uint8Array>(inputChunks, encStream);
      const ciphertext = Buffer.concat(encChunks);

      const decStream = createMultiPqDecryptStream({
        recipientId: bob.id,
        recipientX25519Secret: bob.xPrivHex,
        recipientMlKemSecret: bob.mlPrivHex,
      });

      const decChunks = await pipeThrough<Uint8Array>([ciphertext], decStream);
      const recovered = Buffer.concat(decChunks);

      expect(new TextDecoder().decode(recovered)).to.equal(
        "Web Stream Pipeline Integration across Edge Runtimes",
      );
    });

    it("should fail decryption on tampered ciphertext via TransformStream", async () => {
      const encStream = createMultiPqEncryptStream({
        recipients: [recipients[0] as MultiPqRecipient],
      });
      const encChunks = await pipeThrough<Uint8Array>(
        [Buffer.from("Payload for tampered stream test")],
        encStream,
      );
      const ciphertext = Buffer.concat(encChunks);
      ciphertext[ciphertext.length - 1] ^= 0xff;

      const decStream = createMultiPqDecryptStream({
        recipientId: alice.id,
        recipientX25519Secret: alice.xPriv,
        recipientMlKemSecret: alice.mlPriv,
      });

      try {
        await pipeThrough<Uint8Array>([ciphertext], decStream);
        expect.fail("Expected stream decryption to fail");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
  });

  describe("Validation and Error Handling", () => {
    it("should throw when recipients array is empty or not an array", () => {
      expect(() =>
        streamMultiPqEncrypt({
          recipients: [],
          plaintext: new Uint8Array(10),
        }),
      ).to.throw("At least one recipient is required");

      expect(() =>
        streamMultiPqEncrypt({
          recipients: null as unknown as MultiPqRecipient[],
          plaintext: new Uint8Array(10),
        }),
      ).to.throw("At least one recipient is required");
    });

    it("should throw when recipient count exceeds 1000", () => {
      const dummy = recipients[0] as MultiPqRecipient;
      const many = new Array(1001).fill(dummy);
      expect(() =>
        streamMultiPqEncrypt({
          recipients: many,
          plaintext: new Uint8Array(10),
        }),
      ).to.throw("Recipient count exceeds maximum limit of 1000");
    });

    it("should throw when recipientId is invalid", () => {
      expect(() =>
        streamMultiPqEncrypt({
          recipients: [
            {
              recipientId: "",
              recipientX25519Public: alice.xPub,
              recipientMlKemPublic: alice.mlPub,
            },
          ],
          plaintext: new Uint8Array(10),
        }),
      ).to.throw("Recipient ID must be a non-empty string");

      expect(() =>
        streamMultiPqEncrypt({
          recipients: [
            {
              recipientId: "a".repeat(256),
              recipientX25519Public: alice.xPub,
              recipientMlKemPublic: alice.mlPub,
            },
          ],
          plaintext: new Uint8Array(10),
        }),
      ).to.throw("Recipient ID must be between 1 and 255 UTF-8 bytes");
    });

    it("should throw when chunkSize is out of bounds", () => {
      expect(() =>
        streamMultiPqEncrypt({
          recipients: [recipients[0] as MultiPqRecipient],
          plaintext: new Uint8Array(10),
          chunkSize: 512,
        }),
      ).to.throw("Chunk size must be between 1024 and 16777216 bytes");

      expect(() =>
        streamMultiPqEncrypt({
          recipients: [recipients[0] as MultiPqRecipient],
          plaintext: new Uint8Array(10),
          chunkSize: 20 * 1024 * 1024,
        }),
      ).to.throw("Chunk size must be between 1024 and 16777216 bytes");
    });

    it("should throw when recipientId is not found in slots", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: "nonexistent@service.com",
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: encResult.ciphertext,
        }),
      ).to.throw(
        'Recipient ID "nonexistent@service.com" not found in stream slots',
      );
    });

    it("should throw when specified recipient slot fails decryption", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: alice.id,
          recipientX25519Secret: mallory.xPriv,
          recipientMlKemSecret: mallory.mlPriv,
          ciphertext: encResult.ciphertext,
        }),
      ).to.throw(`Decryption failed for recipient slot "${alice.id}"`);
    });

    it("should throw when no matching slot decrypts in trial mode", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: mallory.xPriv,
          recipientMlKemSecret: mallory.mlPriv,
          ciphertext: encResult.ciphertext,
        }),
      ).to.throw("No matching recipient key slot could be decrypted");
    });

    it("should throw on truncated ciphertext prefix", () => {
      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: new Uint8Array(20),
        }),
      ).to.throw("Ciphertext too short: missing header prefix");
    });

    it("should throw on invalid magic bytes", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const corrupted = new Uint8Array(encResult.ciphertext);
      corrupted[0] = 0x00;

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: corrupted,
        }),
      ).to.throw("Invalid multi-recipient post-quantum stream magic");
    });

    it("should throw on unsupported version", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const corrupted = new Uint8Array(encResult.ciphertext);
      corrupted[4] = 0x99;

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: corrupted,
        }),
      ).to.throw(
        "Unsupported multi-recipient post-quantum stream version: 153",
      );
    });

    it("should throw on invalid header chunkSize", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const corrupted = new Uint8Array(encResult.ciphertext);
      new DataView(corrupted.buffer, corrupted.byteOffset).setUint32(
        5,
        50,
        false,
      );

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: corrupted,
        }),
      ).to.throw("Invalid stream header chunk size: 50");
    });

    it("should throw on zero recipients in header", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const corrupted = new Uint8Array(encResult.ciphertext);
      new DataView(corrupted.buffer, corrupted.byteOffset).setUint16(
        33,
        0,
        false,
      );

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: corrupted,
        }),
      ).to.throw("Invalid stream header: zero recipients");
    });

    it("should throw on truncated slot table", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const truncated = encResult.ciphertext.subarray(0, MULTI_PQ_PREFIX_LEN);

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: truncated,
        }),
      ).to.throw("Ciphertext truncated: incomplete slot table");
    });

    it("should throw on truncated slot entry", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const truncated = encResult.ciphertext.subarray(
        0,
        MULTI_PQ_PREFIX_LEN + 20,
      );

      expect(() =>
        streamMultiPqDecrypt({
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: truncated,
        }),
      ).to.throw("Ciphertext truncated: incomplete recipient slot");
    });

    it("should throw on tampered slot ciphertext", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const tampered = new Uint8Array(encResult.ciphertext);
      // Tamper wrapped CEK byte
      tampered[
        MULTI_PQ_PREFIX_LEN + 1 + alice.id.length + 32 + 1088 + 24 + 5
      ] ^= 0xff;

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: alice.id,
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: tampered,
        }),
      ).to.throw(`Decryption failed for recipient slot "${alice.id}"`);
    });

    it("should throw on invalid chunk tag", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: new Uint8Array(10),
      });
      const tampered = new Uint8Array(encResult.ciphertext);
      // The last chunk tag is at offset: ciphertext.length - 1 - 10 - 16 = ciphertext.length - 27
      const chunkTagOffset = encResult.ciphertext.length - 1 - 10 - 16;
      tampered[chunkTagOffset] = 0x42; // Invalid tag

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: alice.id,
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: tampered,
        }),
      ).to.throw("Invalid chunk tag: 0x42");
    });

    it("should throw on incomplete chunk payload", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: randomBytes(3000),
        chunkSize: 1024,
      });
      const tampered = new Uint8Array(encResult.ciphertext);
      const firstChunkTagOffset =
        MULTI_PQ_PREFIX_LEN + 1 + alice.id.length + 32 + 1088 + 24 + 48;
      // Truncate halfway through chunk 1
      const truncated = tampered.subarray(0, firstChunkTagOffset + 1 + 500);

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: alice.id,
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: truncated,
        }),
      ).to.throw("Ciphertext truncated: incomplete chunk");
    });

    it("should throw when final chunk is missing", () => {
      const encResult = streamMultiPqEncrypt({
        recipients: [recipients[0] as MultiPqRecipient],
        plaintext: randomBytes(3000),
        chunkSize: 1024,
      });
      const tampered = new Uint8Array(encResult.ciphertext);
      const firstChunkTagOffset =
        MULTI_PQ_PREFIX_LEN + 1 + alice.id.length + 32 + 1088 + 24 + 48;
      // Slice off only the first chunk (which is intermediate, tag 0x00)
      const firstChunkTotal = 1 + 1024 + 16;
      const onlyFirstChunk = tampered.subarray(
        0,
        firstChunkTagOffset + firstChunkTotal,
      );

      expect(() =>
        streamMultiPqDecrypt({
          recipientId: alice.id,
          recipientX25519Secret: alice.xPriv,
          recipientMlKemSecret: alice.mlPriv,
          ciphertext: onlyFirstChunk,
        }),
      ).to.throw("Ciphertext truncated: final chunk missing");
    });
  });
});
