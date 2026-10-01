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
 *
 * Version 0x02 (written by `passwordEncrypt`) passes the whole 57-byte header
 * to XChaCha20-Poly1305 as associated data, so the tag authenticates the
 * version, Argon2 parameters, salt and nonce as well as the ciphertext.
 * Version 0x01 (legacy, no associated data) is still accepted by
 * `passwordDecrypt` so existing payloads open; it is never written.
 * The Argon2 cost caps apply to both versions before any key derivation.
 */

import { argon2id } from "@noble/hashes/argon2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { checkArgon2Costs } from "../modern/cost-limits";

/** Legacy format version: header not authenticated (decrypt only). */
const VERSION_V1 = 0x01;
/** Current format version: header authenticated as AEAD associated data. */
const VERSION_V2 = 0x02;
/** Random salt length in bytes. */
const SALT_LEN = 16;
/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Derived key length in bytes (256 bits). */
const KEY_LEN = 32;
/** Poly1305 authentication tag length in bytes. */
const TAG_LEN = 16;
/** Total header length preceding the ciphertext. */
const HEADER_LEN = 1 + 4 + 4 + 4 + 4 + SALT_LEN + NONCE_LEN; // 57

/** Default Argon2id time cost (OWASP recommended). */
const DEFAULT_TIME = 3;
/** Default Argon2id memory cost in KiB (64 MiB). */
const DEFAULT_MEMORY = 65536; // 64 MiB
/** Default Argon2id parallelism. */
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

/** Convert a string or Uint8Array to UTF-8 bytes. */
function toBytes(input: string | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : Buffer.from(input, "utf8");
}

/** Write a 32-bit unsigned integer in little-endian byte order. */
function writeU32LE(buf: Uint8Array, value: number, offset: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

/** Read a 32-bit unsigned integer in little-endian byte order. */
function readU32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset]! |
      (buf[offset + 1]! << 8) |
      (buf[offset + 2]! << 16) |
      (buf[offset + 3]! << 24)) >>>
    0
  );
}

/** Build the self-describing v2 header (also the AEAD associated data). */
function buildHeader(
  t: number,
  m: number,
  p: number,
  salt: Uint8Array,
  nonce: Uint8Array,
): Uint8Array {
  const header = new Uint8Array(HEADER_LEN);
  header[0] = VERSION_V2;
  writeU32LE(header, t, 1);
  writeU32LE(header, m, 5);
  writeU32LE(header, p, 9);
  writeU32LE(header, KEY_LEN, 13);
  header.set(salt, 17);
  header.set(nonce, 17 + SALT_LEN);
  return header;
}

/**
 * Encrypt plaintext with a password using Argon2id + XChaCha20-Poly1305.
 *
 * The output is self-describing: all Argon2 parameters and the salt are
 * embedded in the ciphertext header, so decryption only needs the password.
 * Costs are bounded (see `cost-limits`) because decryption reads them from
 * that untrusted header; encryption applies the same bounds so it never
 * produces a payload decryption would refuse.
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
  checkArgon2Costs(t, m, p);

  const salt = randomBytes(SALT_LEN);
  const key = argon2id(pwd, salt, { t, m, p, dkLen: KEY_LEN });

  const nonce = randomBytes(NONCE_LEN);
  const header = buildHeader(t, m, p, salt, nonce);
  const ct = xchacha20poly1305(key, nonce, header).encrypt(pt);

  const out = new Uint8Array(HEADER_LEN + ct.length);
  out.set(header, 0);
  out.set(ct, HEADER_LEN);

  return {
    encrypted: Buffer.from(out).toString("base64"),
    algorithm: "argon2id-xchacha20-poly1305",
  };
}

/**
 * Decrypt a password-encrypted payload (format version 0x02, or legacy 0x01).
 *
 * @throws If the password is wrong, the data has been tampered with, the
 *   version is unknown, or the header costs exceed the configured caps.
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

  const version = raw[0]!;
  if (version !== VERSION_V1 && version !== VERSION_V2) {
    throw new Error(`Unsupported format version: ${version}`);
  }

  const t = readU32LE(raw, 1);
  const m = readU32LE(raw, 5);
  const p = readU32LE(raw, 9);
  const dkLen = readU32LE(raw, 13);
  const salt = raw.subarray(17, 17 + SALT_LEN);
  const nonce = raw.subarray(17 + SALT_LEN, HEADER_LEN);
  const ct = raw.subarray(HEADER_LEN);

  checkArgon2Costs(t, m, p);
  if (dkLen !== KEY_LEN) {
    throw new Error(`Unsupported key length in header: ${dkLen}`);
  }
  const key = argon2id(pwd, salt, { t, m, p, dkLen });
  const aad = version === VERSION_V2 ? raw.subarray(0, HEADER_LEN) : undefined;
  return xchacha20poly1305(key, nonce, aad).decrypt(ct);
}
