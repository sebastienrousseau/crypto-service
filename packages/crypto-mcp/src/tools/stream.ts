// SPDX-License-Identifier: Apache-2.0 OR MIT

import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import {
  streamPqEncrypt,
  streamPqDecrypt,
} from "@sebastienrousseau/crypto-lib/streaming";
import { keyStore } from "./keystore";
import { ToolHandler, jsonResult } from "./result";

/**
 * `crypto_stream_encrypt`: post-quantum hybrid STREAM AEAD encryption
 * combining X25519, ML-KEM-768, and XChaCha20-Poly1305.
 */
export const streamEncrypt: ToolHandler = async (args) => {
  const plaintext = Buffer.from(String(args.plaintext), "utf8");
  const recipientX25519Public = String(args.x25519PublicKey);
  const recipientMlKemPublic = String(args.mlKemPublicKey);
  const chunkSize =
    args.chunkSize !== undefined ? Number(args.chunkSize) : undefined;

  const result = streamPqEncrypt({
    recipientX25519Public,
    recipientMlKemPublic,
    plaintext,
    chunkSize,
  });

  return jsonResult({
    algorithm: result.algorithm,
    ciphertext: Buffer.from(result.ciphertext).toString("base64"),
    chunkSize: chunkSize ?? 65536,
  });
};

/**
 * `crypto_stream_decrypt`: post-quantum hybrid STREAM AEAD decryption
 * using server-held X25519 and ML-KEM-768 key handles. Plaintext buffer
 * memory is zeroed after converting to UTF-8.
 */
export const streamDecrypt: ToolHandler = async (args) => {
  const ciphertext = Buffer.from(String(args.ciphertext), "base64");
  const xKey = keyStore.use(String(args.x25519KeyHandle), [
    "x25519",
    "symmetric-256",
  ]);
  const mlKey = keyStore.use(String(args.mlKemKeyHandle), ["ml-kem-768"]);
  const chunkSize =
    args.chunkSize !== undefined ? Number(args.chunkSize) : undefined;

  const decrypted = streamPqDecrypt({
    recipientX25519Secret: xKey.secret as Buffer,
    recipientMlKemSecret: mlKey.secret as Buffer,
    ciphertext,
    chunkSize,
  });

  const plaintext = Buffer.from(decrypted).toString("utf8");
  wipeMemory(decrypted);

  return jsonResult({
    algorithm: "x25519-ml-kem-768-xchacha20-poly1305-stream",
    plaintext,
  });
};
