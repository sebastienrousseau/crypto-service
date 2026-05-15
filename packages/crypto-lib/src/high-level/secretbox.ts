/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Secretbox — simple symmetric authenticated encryption.
 *
 * Wraps XChaCha20-Poly1305 with automatic nonce generation so callers
 * never need to manage nonces.  The sealed output is self-contained:
 *
 *   nonce (24 B) || ciphertext || Poly1305 tag (16 B)
 *
 * This is the recommended API for symmetric encryption.
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

const NONCE_LEN = 24;
const KEY_LEN = 32;
const TAG_LEN = 16;
const HEX_RE = /^[0-9a-fA-F]*$/;

function toKey(key: string | Uint8Array): Uint8Array {
  if (key instanceof Uint8Array) {
    if (key.length !== KEY_LEN) {
      throw new Error(`Key must be ${KEY_LEN} bytes, got ${key.length}`);
    }
    return key;
  }
  if (!HEX_RE.test(key)) throw new Error("Invalid hex key");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `Key must be ${KEY_LEN} bytes (${KEY_LEN * 8} bits), got ${buf.length}`,
    );
  }
  return buf;
}

function toData(input: string | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : Buffer.from(input, "utf8");
}

/** Result of a secretbox encryption (XChaCha20-Poly1305). */
export interface SecretboxResult {
  /** Base64-encoded sealed box (nonce || ciphertext || tag). */
  sealed: string;
  /** Algorithm identifier. */
  algorithm: "xchacha20-poly1305";
}

/**
 * Encrypt and authenticate `plaintext` with a 256-bit `key`.
 *
 * A random 24-byte nonce is generated internally and prepended to the
 * output — callers never touch nonces.
 */
export function seal(
  key: string | Uint8Array,
  plaintext: string | Uint8Array,
  aad?: Uint8Array,
): SecretboxResult {
  const k = toKey(key);
  const pt = toData(plaintext);
  const nonce = randomBytes(NONCE_LEN);
  const cipher = xchacha20poly1305(k, nonce, aad);
  const ct = cipher.encrypt(pt);
  const out = new Uint8Array(NONCE_LEN + ct.length);
  out.set(nonce);
  out.set(ct, NONCE_LEN);
  return {
    sealed: Buffer.from(out).toString("base64"),
    algorithm: "xchacha20-poly1305",
  };
}

/**
 * Decrypt and verify a sealed box produced by {@link seal}.
 *
 * @throws If the key is wrong or the ciphertext has been tampered with.
 */
export function open(
  key: string | Uint8Array,
  sealed: string | Uint8Array,
  aad?: Uint8Array,
): Uint8Array {
  const k = toKey(key);
  const raw =
    sealed instanceof Uint8Array ? sealed : Buffer.from(sealed, "base64");
  if (raw.length < NONCE_LEN + TAG_LEN) {
    throw new Error("Sealed box too short — missing nonce or auth tag");
  }
  const nonce = raw.subarray(0, NONCE_LEN);
  const ct = raw.subarray(NONCE_LEN);
  const cipher = xchacha20poly1305(k, nonce, aad);
  return cipher.decrypt(ct);
}
