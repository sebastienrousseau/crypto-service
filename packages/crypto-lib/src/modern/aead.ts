/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks AEAD encryption/decryption using XChaCha20-Poly1305.
 *
 * XChaCha20-Poly1305 is the recommended AEAD cipher for new applications:
 * - 256-bit key security
 * - 192-bit nonce (safe for random generation — no nonce reuse risk)
 * - Authentication tag prevents tampering
 * - Faster than AES-GCM on platforms without AES-NI
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto";

/** Result of an XChaCha20-Poly1305 encryption operation. */
export interface AeadEncryptResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: "xchacha20-poly1305";
}

/** Options for XChaCha20-Poly1305 encryption. */
export interface AeadEncryptOptions {
  /** 256-bit key (32 bytes), hex or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt (UTF-8 string or bytes). */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Options for XChaCha20-Poly1305 decryption. */
export interface AeadDecryptOptions {
  /** 256-bit key (32 bytes), hex or Uint8Array. */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext (as returned by encrypt). */
  ciphertext: string;
  /** Optional additional authenticated data (must match what was used during encryption). */
  aad?: Uint8Array;
}

const HEX_RE = /^[0-9a-fA-F]*$/;

function toBytes(
  input: string | Uint8Array,
  encoding: "hex" | "utf8" = "utf8",
): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (encoding === "hex") {
    if (!HEX_RE.test(input)) {
      throw new Error("Invalid hex string");
    }
    return Buffer.from(input, "hex");
  }
  return Buffer.from(input, "utf8");
}

const NONCE_LENGTH = 24; // XChaCha20 uses 24-byte nonces

/**
 * Encrypt plaintext using XChaCha20-Poly1305.
 *
 * Returns a single base64 blob: `nonce (24B) || ciphertext || tag (16B)`.
 */
export function aeadEncrypt(options: AeadEncryptOptions): AeadEncryptResult {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const plaintext = toBytes(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);

  const cipher = xchacha20poly1305(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  // Prepend nonce to ciphertext for self-contained decryption
  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    algorithm: "xchacha20-poly1305",
  };
}

/**
 * Decrypt XChaCha20-Poly1305 ciphertext.
 *
 * Expects the format produced by `aeadEncrypt`: base64(`nonce || ciphertext || tag`).
 */
export function aeadDecrypt(options: AeadDecryptOptions): Uint8Array {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + 16) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);

  const cipher = xchacha20poly1305(key, nonce, options.aad);
  return cipher.decrypt(sealed);
}
