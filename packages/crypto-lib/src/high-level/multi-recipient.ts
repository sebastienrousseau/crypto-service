/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Multi-recipient encryption — encrypt once, wrap the symmetric key
 * for each recipient.
 *
 * Strategy:
 * 1. Generate a random 256-bit data-encryption key (DEK).
 * 2. Encrypt the plaintext once with the DEK using secretbox.
 * 3. For each recipient, wrap the DEK using their public key:
 *    - Classical (X25519): ephemeral ECDH + HKDF → AES-KW
 *    - Post-quantum (X25519 + ML-KEM-768): hybrid ephemeral → AES-KW
 *
 * Output: the single ciphertext + per-recipient wrapped DEKs.
 */

import { randomBytes } from "@noble/ciphers/webcrypto";
import * as secretbox from "./secretbox";
import { x25519AesKwWrap, x25519AesKwUnwrap } from "./key-wrap";
import { x25519 } from "@noble/curves/ed25519";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { aeskw } from "@noble/ciphers/aes";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

const HEX_RE = /^[0-9a-fA-F]*$/;

function hexToBytes(hex: string): Uint8Array {
  if (!HEX_RE.test(hex)) throw new Error("Invalid hex string");
  return Buffer.from(hex, "hex");
}

// --- Types ---

/** A recipient identified by a classical X25519 public key. */
export interface ClassicalRecipient {
  /** Recipient type discriminator for classical X25519. */
  type: "x25519";
  /** Recipient's X25519 public key (hex, 32 bytes). */
  publicKey: string;
}

/** A recipient identified by hybrid X25519 + ML-KEM-768 public keys. */
export interface PqRecipient {
  /** Recipient type discriminator for hybrid PQ. */
  type: "x25519-ml-kem-768";
  /** Recipient's X25519 public key (hex, 32 bytes). */
  x25519PublicKey: string;
  /** Recipient's ML-KEM-768 public key (hex). */
  mlKemPublicKey: string;
}

/** A recipient descriptor (classical or post-quantum hybrid). */
export type Recipient = ClassicalRecipient | PqRecipient;

/** A DEK wrapped for a single recipient. */
export interface WrappedKey {
  /** Recipient type. */
  type: "x25519" | "x25519-ml-kem-768";
  /** Base64-encoded wrapped DEK. */
  wrappedKey: string;
  /** Hex-encoded ephemeral public key(s). */
  ephemeralPublicKey: string;
  /** Hex-encoded ML-KEM ciphertext (PQ recipients only). */
  mlKemCiphertext?: string;
}

/** Result of encrypting data for multiple recipients. */
export interface MultiRecipientEncryptResult {
  /** Base64-encoded ciphertext (secretbox). */
  ciphertext: string;
  /** Per-recipient wrapped keys. */
  recipients: WrappedKey[];
  /** Algorithm identifier. */
  algorithm: "multi-recipient-secretbox";
}

/**
 * Encrypt for multiple recipients.
 *
 * @param recipients - Array of recipient public key descriptors.
 * @param plaintext  - Data to encrypt.
 */
export function multiEncrypt(
  recipients: Recipient[],
  plaintext: string | Uint8Array,
): MultiRecipientEncryptResult {
  if (recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  // Generate DEK
  const dek = randomBytes(32);

  // Encrypt once
  const sealed = secretbox.seal(dek, plaintext);

  // Wrap DEK for each recipient
  const wrappedKeys: WrappedKey[] = recipients.map((r) => {
    if (r.type === "x25519") {
      const result = x25519AesKwWrap(r.publicKey, dek);
      return {
        type: "x25519" as const,
        wrappedKey: result.wrapped,
        ephemeralPublicKey: result.ephemeralPublicKey,
      };
    } else {
      // PQ hybrid: X25519 + ML-KEM-768
      const x25519Pub = hexToBytes(r.x25519PublicKey);
      const mlKemPub = hexToBytes(r.mlKemPublicKey);

      // Ephemeral X25519
      const ephPriv = randomBytes(32);
      const ephPub = x25519.getPublicKey(ephPriv);
      const x25519Shared = x25519.getSharedSecret(ephPriv, x25519Pub);

      // ML-KEM encapsulation
      const { cipherText: mlKemCt, sharedSecret: mlKemShared } =
        ml_kem768.encapsulate(mlKemPub);

      // Combine via HKDF
      const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
      combined.set(x25519Shared);
      combined.set(mlKemShared, x25519Shared.length);
      const kek = hkdf(sha256, combined, ephPub, "multi-recipient-pq-v1", 32);

      // AES-KW wrap the DEK
      const cipher = aeskw(kek);
      const wrapped = cipher.encrypt(dek);

      return {
        type: "x25519-ml-kem-768" as const,
        wrappedKey: Buffer.from(wrapped).toString("base64"),
        ephemeralPublicKey: Buffer.from(ephPub).toString("hex"),
        mlKemCiphertext: Buffer.from(mlKemCt).toString("hex"),
      };
    }
  });

  return {
    ciphertext: sealed.sealed,
    recipients: wrappedKeys,
    algorithm: "multi-recipient-secretbox",
  };
}

/**
 * Decrypt a multi-recipient message using a classical X25519 key.
 *
 * @param secretKey       - Recipient's X25519 secret key (hex, 32 bytes).
 * @param wrappedKey      - The wrapped key entry for this recipient.
 * @param ciphertext      - The encrypted ciphertext.
 */
export function multiDecryptClassical(
  secretKey: string | Uint8Array,
  wrappedKey: WrappedKey,
  ciphertext: string,
): Uint8Array {
  const dek = x25519AesKwUnwrap(
    secretKey,
    wrappedKey.ephemeralPublicKey,
    wrappedKey.wrappedKey,
  );
  return secretbox.open(dek, ciphertext);
}

/**
 * Decrypt a multi-recipient message using PQ hybrid keys.
 *
 * @param x25519SecretKey - Recipient's X25519 secret key (hex, 32 bytes).
 * @param mlKemSecretKey  - Recipient's ML-KEM-768 secret key (hex).
 * @param wrappedKey      - The wrapped key entry for this recipient.
 * @param ciphertext      - The encrypted ciphertext.
 */
export function multiDecryptPQ(
  x25519SecretKey: string | Uint8Array,
  mlKemSecretKey: string | Uint8Array,
  wrappedKey: WrappedKey,
  ciphertext: string,
): Uint8Array {
  const x25519Sec =
    typeof x25519SecretKey === "string"
      ? hexToBytes(x25519SecretKey)
      : x25519SecretKey;
  const mlKemSec =
    typeof mlKemSecretKey === "string"
      ? hexToBytes(mlKemSecretKey)
      : mlKemSecretKey;

  if (!wrappedKey.mlKemCiphertext) {
    throw new Error("Missing ML-KEM ciphertext in wrapped key");
  }

  const ephPub = hexToBytes(wrappedKey.ephemeralPublicKey);
  const mlKemCt = hexToBytes(wrappedKey.mlKemCiphertext);

  // Recover shared secrets
  const x25519Shared = x25519.getSharedSecret(x25519Sec, ephPub);
  const mlKemShared = ml_kem768.decapsulate(mlKemCt, mlKemSec);

  // Derive KEK
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);
  const kek = hkdf(sha256, combined, ephPub, "multi-recipient-pq-v1", 32);

  // Unwrap DEK
  const wrapped = Buffer.from(wrappedKey.wrappedKey, "base64");
  const cipher = aeskw(kek);
  const dek = cipher.decrypt(wrapped);

  return secretbox.open(dek, ciphertext);
}
