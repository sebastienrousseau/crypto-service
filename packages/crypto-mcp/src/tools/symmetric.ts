// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import { keyStore, symmetricKey } from "./keystore";
import { ToolArgs, ToolHandler, jsonResult } from "./result";

type AeadAlgorithm = "aes-256-gcm" | "chacha20-poly1305";

/** Anything other than ChaCha20-Poly1305 falls back to AES-256-GCM. */
function aeadAlgorithm(value: unknown): AeadAlgorithm {
  return value === "chacha20-poly1305" ? "chacha20-poly1305" : "aes-256-gcm";
}

const AEAD_OPTIONS = { authTagLength: 16 } as const;

function createCipher(algorithm: AeadAlgorithm, key: Buffer, iv: Buffer) {
  if (algorithm === "chacha20-poly1305") {
    return crypto.createCipheriv(algorithm, key, iv, AEAD_OPTIONS);
  }
  return crypto.createCipheriv(algorithm, key, iv, AEAD_OPTIONS);
}

function createDecipher(algorithm: AeadAlgorithm, key: Buffer, iv: Buffer) {
  if (algorithm === "chacha20-poly1305") {
    return crypto.createDecipheriv(algorithm, key, iv, AEAD_OPTIONS);
  }
  return crypto.createDecipheriv(algorithm, key, iv, AEAD_OPTIONS);
}

/** The 256-bit secret a `symmetric-256` key handle refers to. */
export function symmetricSecret(keyHandle: unknown): Buffer {
  return keyStore.use(String(keyHandle), ["symmetric-256"]).secret as Buffer;
}

/** The caller's key handle, or a fresh symmetric key's handle. */
function encryptionKeyHandle(args: ToolArgs): string {
  if (args.keyHandle !== undefined) return String(args.keyHandle);
  return keyStore.add(symmetricKey(crypto.randomBytes(32), "generated"));
}

/**
 * `crypto_encrypt`: AEAD-encrypt plaintext under a key handle. Without
 * one, a fresh key is generated inside the server and its handle is
 * returned; the key itself never is.
 */
export const encrypt: ToolHandler = async (args) => {
  const plaintext = String(args.plaintext);
  const algorithm = aeadAlgorithm(args.algorithm);
  const generatedKey = args.keyHandle === undefined;
  const keyHandle = encryptionKeyHandle(args);
  const iv = crypto.randomBytes(12);
  const cipher = createCipher(algorithm, symmetricSecret(keyHandle), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return jsonResult({
    algorithm,
    keyHandle,
    generatedKey,
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  });
};

/** `crypto_decrypt`: verify and decrypt an AEAD ciphertext. */
export const decrypt: ToolHandler = async (args) => {
  const algorithm = aeadAlgorithm(args.algorithm);
  const key = symmetricSecret(args.keyHandle);
  const iv = Buffer.from(String(args.iv), "hex");
  const decipher = createDecipher(algorithm, key, iv);
  decipher.setAuthTag(Buffer.from(String(args.authTag), "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(args.ciphertext), "hex")),
    decipher.final(),
  ]);
  const plaintext = decrypted.toString("utf8");
  wipeMemory(decrypted);
  return jsonResult({ algorithm, plaintext });
};
