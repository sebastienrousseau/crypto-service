/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Sealed box — anonymous public-key authenticated encryption.
 *
 * The sender generates an ephemeral X25519 key pair, computes a shared
 * secret with the recipient's public key, derives an encryption key via
 * HKDF-SHA256, and encrypts with XChaCha20-Poly1305.
 *
 * Output format:
 *   ephemeral_public (32 B) || nonce (24 B) || ciphertext || tag (16 B)
 *
 * The sender's identity is not revealed (anonymous encryption).
 */

import { x25519 } from "@noble/curves/ed25519.js";
import {
  hybridReceiveKeys,
  hybridSend,
  openWithFirstKey,
} from "../modern/hybrid-combiner";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { CryptoError, CryptoErrorCode } from "../errors";
import { isHex } from "../encoding";

/** Length of an X25519 ephemeral public key in bytes. */
const EPHEMERAL_LEN = 32;
/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Poly1305 authentication tag length in bytes. */
const TAG_LEN = 16;

/** Convert a hex string to bytes, throwing on invalid input. */
function hexToBytes(hex: string): Uint8Array {
  if (!isHex(hex))
    throw new CryptoError("Invalid hex string", CryptoErrorCode.INVALID_HEX);
  return Buffer.from(hex, "hex");
}

/** Convert a string or Uint8Array to UTF-8 bytes. */
function toData(input: string | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : Buffer.from(input, "utf8");
}

/** Result of an anonymous sealed-box encryption (X25519). */
export interface SealedBoxResult {
  /** Base64-encoded sealed box. */
  sealed: string;
  /** Algorithm identifier. */
  algorithm: "x25519-xchacha20-poly1305";
}

/** Result of a post-quantum sealed-box encryption (X25519 + ML-KEM-768). */
export interface PqSealedBoxResult {
  /** Base64-encoded sealed box. */
  sealed: string;
  /** Algorithm identifier. */
  algorithm: "x25519-ml-kem-768-xchacha20-poly1305";
}

/**
 * Encrypt `plaintext` to `recipientPublicKey` anonymously.
 *
 * @param recipientPublicKey - X25519 public key (hex, 32 bytes).
 * @param plaintext          - Data to encrypt.
 */
export function seal(
  recipientPublicKey: string | Uint8Array,
  plaintext: string | Uint8Array,
): SealedBoxResult {
  const recipPub =
    typeof recipientPublicKey === "string"
      ? hexToBytes(recipientPublicKey)
      : recipientPublicKey;

  // Ephemeral key pair
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);

  // X25519 shared secret
  const raw = x25519.getSharedSecret(ephPriv, recipPub);

  // Derive encryption key via HKDF
  const encKey = hkdf(
    sha256,
    raw,
    ephPub,
    new TextEncoder().encode("sealedbox-v1"),
    32,
  );

  // Encrypt
  const nonce = randomBytes(NONCE_LEN);
  const pt = toData(plaintext);
  const cipher = xchacha20poly1305(encKey, nonce);
  const ct = cipher.encrypt(pt);

  // Pack: ephemeral_public || nonce || ciphertext || tag
  const out = new Uint8Array(EPHEMERAL_LEN + NONCE_LEN + ct.length);
  out.set(ephPub);
  out.set(nonce, EPHEMERAL_LEN);
  out.set(ct, EPHEMERAL_LEN + NONCE_LEN);

  return {
    sealed: Buffer.from(out).toString("base64"),
    algorithm: "x25519-xchacha20-poly1305",
  };
}

/**
 * Decrypt a sealed box with the recipient's secret key.
 *
 * @param recipientSecretKey - X25519 secret key (hex, 32 bytes).
 * @param sealed             - Base64-encoded sealed box from {@link seal}.
 */
export function open(
  recipientSecretKey: string | Uint8Array,
  sealed: string | Uint8Array,
): Uint8Array {
  const secKey =
    typeof recipientSecretKey === "string"
      ? hexToBytes(recipientSecretKey)
      : recipientSecretKey;

  const raw =
    sealed instanceof Uint8Array ? sealed : Buffer.from(sealed, "base64");
  const minLen = EPHEMERAL_LEN + NONCE_LEN + TAG_LEN;
  if (raw.length < minLen) {
    throw new CryptoError(
      `Sealed box too short: expected >= ${minLen} bytes, got ${raw.length}`,
      CryptoErrorCode.INVALID_CIPHERTEXT,
    );
  }

  const ephPub = raw.subarray(0, EPHEMERAL_LEN);
  const nonce = raw.subarray(EPHEMERAL_LEN, EPHEMERAL_LEN + NONCE_LEN);
  const ct = raw.subarray(EPHEMERAL_LEN + NONCE_LEN);

  // Recompute shared secret
  const shared = x25519.getSharedSecret(secKey, ephPub);
  const encKey = hkdf(
    sha256,
    shared,
    ephPub,
    new TextEncoder().encode("sealedbox-v1"),
    32,
  );

  const cipher = xchacha20poly1305(encKey, nonce);
  return cipher.decrypt(ct);
}

// --- Post-Quantum Sealed Box (X25519 + ML-KEM-768) ---

/**
 * Encrypt `plaintext` to a recipient using both X25519 and ML-KEM-768.
 *
 * The sender encapsulates to both keys with the library's v2 hybrid KEM
 * (see modern/hybrid-combiner.ts), which binds both ciphertexts and both
 * public keys, and derives the encryption key from its secret with the
 * label `crypto-service/sealed-box/v2`. {@link openPQ} also opens boxes
 * sealed before, whose key bound only the ephemeral key.
 *
 * Output format:
 *   ephemeral_x25519_pub (32 B) || ml_kem_ciphertext (1088 B) ||
 *   nonce (24 B) || ciphertext || tag (16 B)
 *
 * @param recipientX25519Public - Recipient's X25519 public key (hex, 32 bytes).
 * @param recipientMlKemPublic  - Recipient's ML-KEM-768 public key (hex).
 * @param plaintext             - Data to encrypt.
 */
export function sealPQ(
  recipientX25519Public: string | Uint8Array,
  recipientMlKemPublic: string | Uint8Array,
  plaintext: string | Uint8Array,
): PqSealedBoxResult {
  const x25519Pub =
    typeof recipientX25519Public === "string"
      ? hexToBytes(recipientX25519Public)
      : recipientX25519Public;
  const mlKemPub =
    typeof recipientMlKemPublic === "string"
      ? hexToBytes(recipientMlKemPublic)
      : recipientMlKemPublic;

  // The library's v2 hybrid KEM, with the sealed box's own label.
  const {
    ephPub,
    mlKemCt,
    key: encKey,
  } = hybridSend(x25519Pub, mlKemPub, "sealed-box");

  // Encrypt
  const nonce = randomBytes(NONCE_LEN);
  const pt = toData(plaintext);
  const cipher = xchacha20poly1305(encKey, nonce);
  const ct = cipher.encrypt(pt);

  // Pack: eph_x25519 (32) || ml_kem_ct (1088) || nonce (24) || ct || tag
  const mlKemCtLen = mlKemCt.length;
  const out = new Uint8Array(
    EPHEMERAL_LEN + mlKemCtLen + NONCE_LEN + ct.length,
  );
  out.set(ephPub);
  out.set(mlKemCt, EPHEMERAL_LEN);
  out.set(nonce, EPHEMERAL_LEN + mlKemCtLen);
  out.set(ct, EPHEMERAL_LEN + mlKemCtLen + NONCE_LEN);

  return {
    sealed: Buffer.from(out).toString("base64"),
    algorithm: "x25519-ml-kem-768-xchacha20-poly1305",
  };
}

/** ML-KEM-768 ciphertext length in bytes. */
const ML_KEM_768_CT_LEN = 1088;

/**
 * Decrypt a post-quantum sealed box.
 *
 * @param recipientX25519Secret - Recipient's X25519 secret key (hex, 32 bytes).
 * @param recipientMlKemSecret  - Recipient's ML-KEM-768 secret key (hex).
 * @param sealed                - Base64-encoded sealed box from {@link sealPQ}.
 */
export function openPQ(
  recipientX25519Secret: string | Uint8Array,
  recipientMlKemSecret: string | Uint8Array,
  sealed: string | Uint8Array,
): Uint8Array {
  const x25519Sec =
    typeof recipientX25519Secret === "string"
      ? hexToBytes(recipientX25519Secret)
      : recipientX25519Secret;
  const mlKemSec =
    typeof recipientMlKemSecret === "string"
      ? hexToBytes(recipientMlKemSecret)
      : recipientMlKemSecret;

  const raw =
    sealed instanceof Uint8Array ? sealed : Buffer.from(sealed, "base64");
  const minLen = EPHEMERAL_LEN + ML_KEM_768_CT_LEN + NONCE_LEN + TAG_LEN;
  if (raw.length < minLen) {
    throw new CryptoError(
      `PQ sealed box too short: expected >= ${minLen} bytes, got ${raw.length}`,
      CryptoErrorCode.INVALID_CIPHERTEXT,
    );
  }

  const ephPub = raw.subarray(0, EPHEMERAL_LEN);
  const mlKemCt = raw.subarray(
    EPHEMERAL_LEN,
    EPHEMERAL_LEN + ML_KEM_768_CT_LEN,
  );
  const nonce = raw.subarray(
    EPHEMERAL_LEN + ML_KEM_768_CT_LEN,
    EPHEMERAL_LEN + ML_KEM_768_CT_LEN + NONCE_LEN,
  );
  const ct = raw.subarray(EPHEMERAL_LEN + ML_KEM_768_CT_LEN + NONCE_LEN);

  // The v2 key, then the key boxes sealed before it used.
  const keys = hybridReceiveKeys(
    x25519Sec,
    mlKemSec,
    ephPub,
    mlKemCt,
    "sealed-box",
    (x25519Shared, mlKemShared) =>
      hkdf(
        sha256,
        Buffer.concat([x25519Shared, mlKemShared]),
        ephPub,
        new TextEncoder().encode("pq-sealedbox-v1"),
        32,
      ),
  );
  return openWithFirstKey(keys, (key) =>
    xchacha20poly1305(key, nonce).decrypt(ct),
  );
}
