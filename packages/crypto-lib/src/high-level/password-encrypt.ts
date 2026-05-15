/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Password-based encryption — Argon2id key derivation + XChaCha20-Poly1305.
 *
 * Self-describing format so decryption doesn't need external parameters:
 *
 *   version (1 B) || timeCost (4 B LE) || memoryCost (4 B LE) ||
 *   parallelism (4 B LE) || hashLength (4 B LE) || salt (16 B) ||
 *   nonce (24 B) || ciphertext || tag (16 B)
 *
 * Total header overhead: 1 + 16 + 16 + 24 = 57 bytes before ciphertext.
 */

import { argon2id } from "@noble/hashes/argon2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

const VERSION = 0x01;
const SALT_LEN = 16;
const NONCE_LEN = 24;
const KEY_LEN = 32;
const TAG_LEN = 16;
const HEADER_LEN = 1 + 4 + 4 + 4 + 4 + SALT_LEN + NONCE_LEN; // 57

// OWASP 2026 recommended defaults
const DEFAULT_TIME = 3;
const DEFAULT_MEMORY = 65536; // 64 MiB
const DEFAULT_PARALLELISM = 4;

/** Options for password-based encryption (Argon2id + XChaCha20-Poly1305). */
export interface PasswordEncryptOptions {
  /** Password (UTF-8 string or bytes). */
  password: string | Uint8Array;
  /** Plaintext to encrypt. */
  plaintext: string | Uint8Array;
  /** Argon2id time cost (iterations). Default: 3. */
  timeCost?: number;
  /** Argon2id memory cost in KiB. Default: 65536 (64 MiB). */
  memoryCost?: number;
  /** Argon2id parallelism. Default: 4. */
  parallelism?: number;
}

/** Result of a password-based encryption. */
export interface PasswordEncryptResult {
  /** Base64-encoded encrypted payload (self-describing format). */
  encrypted: string;
  /** Algorithm identifier. */
  algorithm: "argon2id-xchacha20-poly1305";
}

function toBytes(input: string | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : Buffer.from(input, "utf8");
}

function writeU32LE(buf: Uint8Array, value: number, offset: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function readU32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset]! |
      (buf[offset + 1]! << 8) |
      (buf[offset + 2]! << 16) |
      (buf[offset + 3]! << 24)) >>>
    0
  );
}

/**
 * Encrypt plaintext with a password using Argon2id + XChaCha20-Poly1305.
 *
 * The output is self-describing: all Argon2 parameters and the salt are
 * embedded in the ciphertext header, so decryption only needs the password.
 */
export function passwordEncrypt(
  options: PasswordEncryptOptions,
): PasswordEncryptResult {
  const pwd = toBytes(options.password);
  const pt = toBytes(options.plaintext);
  /* c8 ignore next 3 -- ?? defaults exercised implicitly; explicit params preferred in tests */
  const t = options.timeCost ?? DEFAULT_TIME;
  const m = options.memoryCost ?? DEFAULT_MEMORY;
  const p = options.parallelism ?? DEFAULT_PARALLELISM;

  const salt = randomBytes(SALT_LEN);
  const key = argon2id(pwd, salt, { t, m, p, dkLen: KEY_LEN });

  const nonce = randomBytes(NONCE_LEN);
  const cipher = xchacha20poly1305(key, nonce);
  const ct = cipher.encrypt(pt);

  // Build self-describing header
  const out = new Uint8Array(HEADER_LEN + ct.length);
  let off = 0;
  out[off++] = VERSION;
  writeU32LE(out, t, off);
  off += 4;
  writeU32LE(out, m, off);
  off += 4;
  writeU32LE(out, p, off);
  off += 4;
  writeU32LE(out, KEY_LEN, off);
  off += 4;
  out.set(salt, off);
  off += SALT_LEN;
  out.set(nonce, off);
  off += NONCE_LEN;
  out.set(ct, off);

  return {
    encrypted: Buffer.from(out).toString("base64"),
    algorithm: "argon2id-xchacha20-poly1305",
  };
}

/**
 * Decrypt a password-encrypted payload.
 *
 * @throws If the password is wrong or the data has been tampered with.
 */
export function passwordDecrypt(
  password: string | Uint8Array,
  encrypted: string | Uint8Array,
): Uint8Array {
  const pwd = toBytes(password);
  const raw =
    encrypted instanceof Uint8Array
      ? encrypted
      : Buffer.from(encrypted, "base64");

  if (raw.length < HEADER_LEN + TAG_LEN) {
    throw new Error("Encrypted payload too short");
  }

  let off = 0;
  const version = raw[off++]!;
  if (version !== VERSION) {
    throw new Error(`Unsupported format version: ${version}`);
  }

  const t = readU32LE(raw, off);
  off += 4;
  const m = readU32LE(raw, off);
  off += 4;
  const p = readU32LE(raw, off);
  off += 4;
  const dkLen = readU32LE(raw, off);
  off += 4;
  const salt = raw.subarray(off, off + SALT_LEN);
  off += SALT_LEN;
  const nonce = raw.subarray(off, off + NONCE_LEN);
  off += NONCE_LEN;
  const ct = raw.subarray(off);

  const key = argon2id(pwd, salt, { t, m, p, dkLen });
  const cipher = xchacha20poly1305(key, nonce);
  return cipher.decrypt(ct);
}
