// SPDX-License-Identifier: Apache-2.0 OR MIT

import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import {
  streamPqEncrypt,
  streamPqDecrypt,
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
  type MultiPqRecipient,
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

/** Parse recipient list for multi-recipient MCP stream encryption. */
const parseMcpRecipients = (raw: unknown): MultiPqRecipient[] => {
  const list = JSON.parse(String(raw));
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      "recipients must be a non-empty array of recipient objects",
    );
  }
  return list as MultiPqRecipient[];
};

/**
 * `crypto_stream_multi_encrypt`: multi-recipient post-quantum hybrid STREAM AEAD
 * encryption combining X25519, ML-KEM-768, and XChaCha20-Poly1305.
 */
export const streamMultiEncrypt: ToolHandler = async (args) => {
  const plaintext = Buffer.from(String(args.plaintext), "utf8");
  const recipients = parseMcpRecipients(args.recipients);
  const chunkSize =
    args.chunkSize !== undefined ? Number(args.chunkSize) : undefined;

  const result = streamMultiPqEncrypt({
    recipients,
    plaintext,
    chunkSize,
  });

  return jsonResult({
    algorithm: result.algorithm,
    ciphertext: Buffer.from(result.ciphertext).toString("base64"),
    recipientCount: result.recipientCount,
    chunkSize: chunkSize ?? 65536,
  });
};

/**
 * `crypto_stream_multi_decrypt`: multi-recipient post-quantum hybrid STREAM AEAD
 * decryption using server-held X25519 and ML-KEM-768 key handles. Plaintext buffer
 * memory is zeroed after converting to UTF-8.
 */
export const streamMultiDecrypt: ToolHandler = async (args) => {
  const ciphertext = Buffer.from(String(args.ciphertext), "base64");
  const xKey = keyStore.use(String(args.x25519KeyHandle), [
    "x25519",
    "symmetric-256",
  ]);
  const mlKey = keyStore.use(String(args.mlKemKeyHandle), ["ml-kem-768"]);
  const recipientId =
    args.recipientId !== undefined ? String(args.recipientId) : undefined;
  const chunkSize =
    args.chunkSize !== undefined ? Number(args.chunkSize) : undefined;

  const decrypted = streamMultiPqDecrypt({
    recipientX25519Secret: xKey.secret as Buffer,
    recipientMlKemSecret: mlKey.secret as Buffer,
    ...(recipientId !== undefined ? { recipientId } : {}),
    ciphertext,
    chunkSize,
  });

  const plaintext = Buffer.from(decrypted.plaintext).toString("utf8");
  wipeMemory(decrypted.plaintext);

  return jsonResult({
    algorithm: "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
    recipientId: decrypted.recipientId,
    plaintext,
  });
};
