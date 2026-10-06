/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of Streaming AEAD and hash with fast-check:
// Streams must reliably round-trip varying byte slices, detect any chunk
// bit-flip tampering, and reject incomplete or truncated streams.

import { expect } from "chai";
import fc from "fast-check";
import { streamEncrypt, streamDecrypt } from "../../src/streaming/stream-aead";
import { createHasher } from "../../src/streaming/stream-hash";
import { wasmHash } from "../../src/accel/wasm-bridge";

describe("Streaming fuzzing (fast-check)", () => {
  const key = "5a".repeat(32);

  it("stream AEAD round-trips arbitrary byte payloads and chunk sizes", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 8192 }),
        fc.integer({ min: 16, max: 512 }),
        (data, chunkSize) => {
          const encrypted = streamEncrypt({
            key,
            plaintext: data,
            chunkSize,
          });

          const decrypted = streamDecrypt({
            key,
            ciphertext: encrypted.ciphertext,
            chunkSize,
          });

          expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(data));
        },
      ),
      { numRuns: 80 },
    );
  });

  it("stream AEAD rejects any single bit flip in the ciphertext", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 1024 }),
        fc.nat(),
        (data, index) => {
          const chunkSize = 64;
          const encrypted = streamEncrypt({
            key,
            plaintext: data,
            chunkSize,
          });

          const tampered = new Uint8Array(encrypted.ciphertext);
          const pos = index % tampered.length;
          tampered[pos] ^= 0x01; // flip 1 bit

          expect(() =>
            streamDecrypt({
              key,
              ciphertext: tampered,
              chunkSize,
            }),
          ).to.throw();
        },
      ),
      { numRuns: 80 },
    );
  });

  it("stream AEAD rejects truncated ciphertexts", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 64, maxLength: 512 }),
        fc.integer({ min: 1, max: 32 }),
        (data, dropBytes) => {
          const chunkSize = 64;
          const encrypted = streamEncrypt({
            key,
            plaintext: data,
            chunkSize,
          });

          const truncated = encrypted.ciphertext.subarray(
            0,
            Math.max(1, encrypted.ciphertext.length - dropBytes),
          );

          expect(() =>
            streamDecrypt({
              key,
              ciphertext: truncated,
              chunkSize,
            }),
          ).to.throw();
        },
      ),
      { numRuns: 60 },
    );
  });

  it("stream hash agrees with one-shot hash over arbitrary chunk boundaries", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 2048 }),
        fc.integer({ min: 1, max: 128 }),
        (data, chunkSize) => {
          const hasher = createHasher("blake3");

          // Feed in variable chunks
          let offset = 0;
          while (offset < data.length) {
            const end = Math.min(offset + chunkSize, data.length);
            hasher.update(data.subarray(offset, end));
            offset = end;
          }

          const streamDigest = hasher.digest();
          const oneShotDigest = wasmHash({
            algorithm: "blake3",
            data,
          });

          expect(streamDigest).to.equal(oneShotDigest.digest);
        },
      ),
      { numRuns: 80 },
    );
  });
});
