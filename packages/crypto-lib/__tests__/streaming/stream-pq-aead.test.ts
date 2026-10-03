/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import {
  streamPqEncrypt,
  streamPqDecrypt,
  toBytes,
  derivePqChunkNonce,
  PQ_STREAM_HEADER_LEN,
  CHUNK_TAG_MESSAGE,
} from "../../src/streaming/stream-pq-aead";

describe("Post-Quantum Streaming AEAD", () => {
  // Generate recipient key pair for tests
  const x25519Priv = randomBytes(32);
  const x25519Pub = x25519.getPublicKey(x25519Priv);
  const { publicKey: mlKemPub, secretKey: mlKemPriv } = ml_kem768.keygen();

  const x25519PubHex = Buffer.from(x25519Pub).toString("hex");
  const mlKemPubHex = Buffer.from(mlKemPub).toString("hex");
  const x25519PrivHex = Buffer.from(x25519Priv).toString("hex");
  const mlKemPrivHex = Buffer.from(mlKemPriv).toString("hex");

  describe("toBytes helper", () => {
    it("should accept valid hex strings and Uint8Arrays", () => {
      const arr = new Uint8Array([1, 2, 3]);
      expect(toBytes(arr, 3)).to.deep.equal(arr);
      expect(toBytes("010203", 3)).to.deep.equal(arr);
      expect(toBytes("010203")).to.deep.equal(arr);
    });

    it("should throw on invalid hex characters", () => {
      expect(() => toBytes("not_hex_!", 4)).to.throw(/Invalid hex string/);
    });

    it("should throw on mismatched byte length", () => {
      expect(() => toBytes(new Uint8Array(10), 32, "testKey")).to.throw(
        /testKey must be 32 bytes, got 10/,
      );
    });
  });

  describe("derivePqChunkNonce", () => {
    it("should handle large counters exceeding 32-bit integers", () => {
      const baseNonce = new Uint8Array(24).fill(0x10);
      const largeCounter = 0x200000005; // High 32 bits = 2, Low 32 bits = 5
      const nonce = derivePqChunkNonce(baseNonce, largeCounter, 0x01);
      expect(nonce.length).to.equal(24);
      expect(nonce[0]).to.equal(0x10 ^ 0x01);
    });
  });

  describe("End-to-End Encryption & Decryption", () => {
    it("should encrypt and decrypt small payload with hex keys", () => {
      const plaintext = Buffer.from("Hybrid Post-Quantum Streaming Test!");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519PubHex,
        recipientMlKemPublic: mlKemPubHex,
        plaintext,
      });

      expect(encrypted.algorithm).to.equal(
        "x25519-ml-kem-768-xchacha20-poly1305-stream",
      );
      expect(encrypted.ciphertext.length).to.be.greaterThan(
        PQ_STREAM_HEADER_LEN + plaintext.length,
      );

      const decrypted = streamPqDecrypt({
        recipientX25519Secret: x25519PrivHex,
        recipientMlKemSecret: mlKemPrivHex,
        ciphertext: encrypted.ciphertext,
      });

      expect(Buffer.from(decrypted).toString("utf8")).to.equal(
        "Hybrid Post-Quantum Streaming Test!",
      );
    });

    it("should encrypt and decrypt using Uint8Array key buffers", () => {
      const plaintext = Buffer.from("Binary buffer test");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      const decrypted = streamPqDecrypt({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
        ciphertext: encrypted.ciphertext,
      });

      expect(Buffer.from(decrypted).toString("utf8")).to.equal(
        "Binary buffer test",
      );
    });

    it("should encrypt and decrypt empty data", () => {
      const plaintext = new Uint8Array(0);
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      const decrypted = streamPqDecrypt({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
        ciphertext: encrypted.ciphertext,
      });

      expect(decrypted.length).to.equal(0);
    });

    it("should encrypt and decrypt multi-chunk data with default and custom chunk size", () => {
      const chunkSize = 128;
      const plaintext = new Uint8Array(500).fill(0x7f);

      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
        chunkSize,
      });

      const decrypted = streamPqDecrypt({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
        ciphertext: encrypted.ciphertext,
        chunkSize,
      });

      expect(decrypted).to.deep.equal(plaintext);
    });

    it("should encrypt and decrypt data that matches exact multiple of chunkSize", () => {
      const chunkSize = 64;
      const plaintext = new Uint8Array(128).fill(0x33);

      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
        chunkSize,
      });

      const decrypted = streamPqDecrypt({
        recipientX25519Secret: x25519Priv,
        recipientMlKemSecret: mlKemPriv,
        ciphertext: encrypted.ciphertext,
        chunkSize,
      });

      expect(decrypted).to.deep.equal(plaintext);
    });
  });

  describe("Security and Tampering Detection", () => {
    it("should fail decryption when given wrong X25519 secret key", () => {
      const wrongX25519Priv = randomBytes(32);
      const plaintext = Buffer.from("Secret Payload");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: wrongX25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: encrypted.ciphertext,
        }),
      ).to.throw();
    });

    it("should fail decryption when given wrong ML-KEM secret key", () => {
      const { secretKey: wrongMlKemPriv } = ml_kem768.keygen();
      const plaintext = Buffer.from("Secret Payload");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: wrongMlKemPriv,
          ciphertext: encrypted.ciphertext,
        }),
      ).to.throw();
    });

    it("should throw if ciphertext is too short", () => {
      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: new Uint8Array(100),
        }),
      ).to.throw(/Ciphertext too short/);
    });

    it("should detect corrupted ciphertext bytes", () => {
      const plaintext = Buffer.from("Tamper check");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      const corrupted = new Uint8Array(encrypted.ciphertext);
      corrupted[corrupted.length - 5]! ^= 0xff;

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: corrupted,
        }),
      ).to.throw();
    });

    it("should reject invalid chunk tags", () => {
      const plaintext = Buffer.from("Invalid tag test");
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
      });

      const corrupted = new Uint8Array(encrypted.ciphertext);
      // The tag byte immediately follows the header
      corrupted[PQ_STREAM_HEADER_LEN] = 0x99;

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: corrupted,
        }),
      ).to.throw(/Invalid chunk tag: 0x99/);
    });

    it("should detect truncated chunk data", () => {
      const chunkSize = 32;
      const plaintext = new Uint8Array(100).fill(0x55);
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
        chunkSize,
      });

      // Slice off the last few bytes of an intermediate chunk
      const truncated = encrypted.ciphertext.subarray(
        0,
        PQ_STREAM_HEADER_LEN + 20,
      );

      // Force first chunk tag to be intermediate message
      const manipulated = new Uint8Array(truncated);
      manipulated[PQ_STREAM_HEADER_LEN] = CHUNK_TAG_MESSAGE;

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: manipulated,
          chunkSize,
        }),
      ).to.throw(/Ciphertext truncated — incomplete chunk/);
    });

    it("should detect missing final chunk marker (truncated at chunk boundary)", () => {
      const chunkSize = 32;
      const plaintext = new Uint8Array(100).fill(0x55);
      const encrypted = streamPqEncrypt({
        recipientX25519Public: x25519Pub,
        recipientMlKemPublic: mlKemPub,
        plaintext,
        chunkSize,
      });

      // Keep header + two whole MESSAGE chunks, dropping the remaining chunks
      const boundary = PQ_STREAM_HEADER_LEN + 2 * (1 + chunkSize + 16);
      const truncatedAtBoundary = encrypted.ciphertext.subarray(0, boundary);

      expect(() =>
        streamPqDecrypt({
          recipientX25519Secret: x25519Priv,
          recipientMlKemSecret: mlKemPriv,
          ciphertext: truncatedAtBoundary,
          chunkSize,
        }),
      ).to.throw(/Ciphertext truncated — final chunk missing/);
    });
  });
});
