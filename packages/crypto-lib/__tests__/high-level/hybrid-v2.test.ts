/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// One hybrid KEM for every X25519 + ML-KEM-768 construction. The sealed
// box, the multi-recipient envelope and the two post-quantum streams each
// derived their key from the two shared secrets with only the ephemeral
// key bound, not the recipient's public keys or the ML-KEM ciphertext.
// They now take the library's v2 hybrid KEM secret (see pq-kem.ts), which
// binds both ciphertexts and both public keys, and derive their key from it
// with their own label. Outputs written before still decrypt.
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { aeskw } from "@noble/ciphers/aes.js";
import { hybridKemDecapsulate, hybridKemKeygen } from "../../src/modern/pq-kem";
import { openPQ, sealPQ } from "../../src/high-level/sealedbox";
import {
  multiDecryptPQ,
  multiEncrypt,
  unwrapDekHybrid,
  wrapDekHybrid,
} from "../../src/high-level/multi-recipient";
import {
  PQ_STREAM_HEADER_LEN,
  derivePqChunkNonce,
  streamPqDecrypt,
  streamPqEncrypt,
} from "../../src/streaming/stream-pq-aead";
import { ChunkDecryptor, decryptChunks } from "../../src/streaming/chunks";
import {
  streamMultiPqDecrypt,
  streamMultiPqEncrypt,
} from "../../src/streaming/stream-multi-pq-aead";

const legacy = JSON.parse(
  readFileSync(
    path.join(
      String(process.env["CRYPTO_KEY_DIR"]),
      "..",
      "legacy",
      "hybrid-v1.json",
    ),
    "utf8",
  ),
);
const keys = legacy.keys as Record<string, string>;
const text = (b: Uint8Array) => Buffer.from(b).toString("utf8");
const label = (name: string) =>
  new TextEncoder().encode(`crypto-service/${name}/v2`);

describe("one v2 hybrid KEM for every construction", function () {
  this.timeout(60000);

  describe("outputs written before still decrypt", () => {
    it("sealed box", () => {
      expect(
        text(
          openPQ(
            keys["x25519SecretKey"]!,
            keys["mlKemSecretKey"]!,
            legacy.sealPQ,
          ),
        ),
      ).to.equal(legacy.plaintext);
    });

    it("multi-recipient envelope and wrapped key", () => {
      const env = legacy.multiEncrypt;
      expect(
        text(
          multiDecryptPQ(
            keys["x25519SecretKey"]!,
            keys["mlKemSecretKey"]!,
            env.recipients[0],
            env.ciphertext,
          ),
        ),
      ).to.equal(legacy.plaintext);
      const w = legacy.wrapDekHybrid;
      const dek = unwrapDekHybrid(
        keys["x25519SecretKey"]!,
        keys["mlKemSecretKey"]!,
        w.ephemeralPublicKey,
        w.mlKemCiphertext,
        w.wrappedKey,
      );
      expect(Buffer.from(dek).toString("hex")).to.equal(w.dekHex);
    });

    it("post-quantum streams", () => {
      const secrets = {
        recipientX25519Secret: keys["x25519SecretKey"]!,
        recipientMlKemSecret: keys["mlKemSecretKey"]!,
      };
      const single = streamPqDecrypt({
        ...secrets,
        ciphertext: Buffer.from(legacy.streamPqHex, "hex"),
        chunkSize: 1024,
      });
      expect(Buffer.from(single).toString("hex")).to.equal(
        legacy.streamPlaintextHex,
      );
      const multi = streamMultiPqDecrypt({
        ...secrets,
        ciphertext: Buffer.from(legacy.streamMultiPqHex, "hex"),
      });
      expect(Buffer.from(multi.plaintext).toString("hex")).to.equal(
        legacy.streamPlaintextHex,
      );
    });
  });

  describe("new outputs use the v2 hybrid KEM", () => {
    const kp = hybridKemKeygen(768);

    it("sealed box key = HKDF(v2 secret, sealed-box label)", () => {
      const sealed = Buffer.from(
        sealPQ(kp.x25519PublicKey, kp.mlKemPublicKey, "v2 box").sealed,
        "base64",
      );
      const eph = sealed.subarray(0, 32);
      const ct = sealed.subarray(32, 32 + 1088);
      const { sharedSecret } = hybridKemDecapsulate(
        768,
        kp.x25519PrivateKey,
        kp.mlKemSecretKey,
        eph.toString("hex"),
        ct.toString("hex"),
      );
      const key = hkdf(
        sha256,
        Buffer.from(sharedSecret, "hex"),
        undefined,
        label("sealed-box"),
        32,
      );
      const nonce = sealed.subarray(1120, 1144);
      expect(
        text(xchacha20poly1305(key, nonce).decrypt(sealed.subarray(1144))),
      ).to.equal("v2 box");
      expect(
        text(openPQ(kp.x25519PrivateKey, kp.mlKemSecretKey, sealed)),
      ).to.equal("v2 box");
    });

    it("wrapped key KEK = HKDF(v2 secret, multi-recipient label)", () => {
      const dek = new Uint8Array(32).fill(9);
      const w = wrapDekHybrid(dek, kp.x25519PublicKey, kp.mlKemPublicKey);
      const { sharedSecret } = hybridKemDecapsulate(
        768,
        kp.x25519PrivateKey,
        kp.mlKemSecretKey,
        w.ephemeralPublicKey,
        w.mlKemCiphertext,
      );
      const kek = hkdf(
        sha256,
        Buffer.from(sharedSecret, "hex"),
        undefined,
        label("multi-recipient"),
        32,
      );
      expect(
        aeskw(kek).decrypt(Buffer.from(w.wrappedKey, "base64")),
      ).to.deep.equal(dek);
      const env = multiEncrypt(
        [
          {
            type: "x25519-ml-kem-768",
            x25519PublicKey: kp.x25519PublicKey,
            mlKemPublicKey: kp.mlKemPublicKey,
          },
        ],
        "envelope",
      );
      expect(
        text(
          multiDecryptPQ(
            kp.x25519PrivateKey,
            kp.mlKemSecretKey,
            env.recipients[0]!,
            env.ciphertext,
          ),
        ),
      ).to.equal("envelope");
    });

    it("stream key = HKDF(v2 secret, pq-stream label)", () => {
      const { ciphertext } = streamPqEncrypt({
        recipientX25519Public: kp.x25519PublicKey,
        recipientMlKemPublic: kp.mlKemPublicKey,
        plaintext: new TextEncoder().encode("v2 stream"),
        chunkSize: 1024,
      });
      const header = Buffer.from(ciphertext.subarray(0, PQ_STREAM_HEADER_LEN));
      const { sharedSecret } = hybridKemDecapsulate(
        768,
        kp.x25519PrivateKey,
        kp.mlKemSecretKey,
        header.subarray(0, 32).toString("hex"),
        header.subarray(32, 1120).toString("hex"),
      );
      const key = hkdf(
        sha256,
        Buffer.from(sharedSecret, "hex"),
        undefined,
        label("pq-stream"),
        32,
      );
      const decryptor = new ChunkDecryptor(
        key,
        header.subarray(1120),
        1024,
        derivePqChunkNonce,
      );
      expect(
        text(
          decryptChunks(decryptor, ciphertext.subarray(PQ_STREAM_HEADER_LEN)),
        ),
      ).to.equal("v2 stream");
    });

    it("streams round-trip", () => {
      const plaintext = new Uint8Array(5000).fill(3);
      const secrets = {
        recipientX25519Secret: kp.x25519PrivateKey,
        recipientMlKemSecret: kp.mlKemSecretKey,
      };
      const { ciphertext } = streamPqEncrypt({
        recipientX25519Public: kp.x25519PublicKey,
        recipientMlKemPublic: kp.mlKemPublicKey,
        plaintext,
        chunkSize: 1024,
      });
      expect(
        streamPqDecrypt({ ...secrets, ciphertext, chunkSize: 1024 }),
      ).to.deep.equal(plaintext);
      const multi = streamMultiPqEncrypt({
        recipients: [
          {
            recipientId: "a",
            recipientX25519Public: kp.x25519PublicKey,
            recipientMlKemPublic: kp.mlKemPublicKey,
          },
        ],
        plaintext,
        chunkSize: 1024,
      });
      expect(
        streamMultiPqDecrypt({ ...secrets, ciphertext: multi.ciphertext })
          .plaintext,
      ).to.deep.equal(plaintext);
    });
  });
});
