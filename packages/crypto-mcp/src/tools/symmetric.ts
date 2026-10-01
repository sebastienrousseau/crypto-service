// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { ToolHandler, jsonResult, parseKey256 } from "./result";

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

/** `crypto_encrypt`: AEAD-encrypt plaintext with a supplied or fresh key. */
export const encrypt: ToolHandler = async (args) => {
  const plaintext = String(args.plaintext);
  const algorithm = aeadAlgorithm(args.algorithm);
  const generatedKey = !args.key;
  const key = generatedKey ? crypto.randomBytes(32) : parseKey256(args.key);
  const iv = crypto.randomBytes(12);
  const cipher = createCipher(algorithm, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return jsonResult({
    algorithm,
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    key: generatedKey ? key.toString("hex") : undefined,
  });
};

/** `crypto_decrypt`: verify and decrypt an AEAD ciphertext. */
export const decrypt: ToolHandler = async (args) => {
  const algorithm = (args.algorithm as string) || "aes-256-gcm";
  const key = parseKey256(args.key);
  const iv = Buffer.from(String(args.iv), "hex");
  const decipher = createDecipher(aeadAlgorithm(algorithm), key, iv);
  decipher.setAuthTag(Buffer.from(String(args.authTag), "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(args.ciphertext), "hex")),
    decipher.final(),
  ]);
  return jsonResult({ algorithm, plaintext: decrypted.toString("utf8") });
};
