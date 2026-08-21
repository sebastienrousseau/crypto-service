/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Request body type definitions for the Crypto Server REST API.
 *
 * Routes accept JSON bodies via POST — secrets must not transit in URL
 * headers because every reverse proxy in the chain logs them.
 */

/**
 * Allowed key types for generation.
 */
export const KEY_TYPES = ["ecc", "rsa"] as const;
/** Union of allowed key types: `"ecc"` or `"rsa"`. */
export type KeyType = (typeof KEY_TYPES)[number];

/**
 * Allowed curve types for ECC keys.
 */
export const CURVE_TYPES = [
  "curve25519",
  "ed25519",
  "p256",
  "p384",
  "p521",
  "secp256k1",
  "brainpoolP256r1",
  "brainpoolP384r1",
  "brainpoolP512r1",
] as const;
/** Union of allowed ECC curve names (e.g. `"curve25519"`, `"p256"`). */
export type CurveType = (typeof CURVE_TYPES)[number];

/**
 * Allowed key formats.
 */
export const FORMAT_TYPES = ["armored", "binary", "object"] as const;
/** Union of allowed key output formats: `"armored"`, `"binary"`, or `"object"`. */
export type FormatType = (typeof FORMAT_TYPES)[number];

/**
 * Allowed revocation flags.
 */
export const REVOCATION_FLAGS = [0, 1, 2, 3] as const;
/** Revocation reason code: 0 = no reason, 1 = superseded, 2 = compromised, 3 = retired. */
export type RevocationFlag = (typeof REVOCATION_FLAGS)[number];

/**
 * Request body for the key generation endpoint.
 *
 * @example
 * ```json
 * {
 *   "name": "Alice",
 *   "email": "alice@example.com",
 *   "type": "ecc",
 *   "passphrase": "s3cret",
 *   "curve": "curve25519",
 *   "format": "armored"
 * }
 * ```
 */
export interface IBodyGenerate {
  /** Display name embedded in the key's user ID. */
  name: string;
  /** Email address embedded in the key's user ID. */
  email: string;
  /** Key algorithm family. */
  type: KeyType;
  /** Passphrase used to protect the private key. */
  passphrase: string;
  /** RSA modulus size in bits (only used when `type` is `"rsa"`). */
  rsaBits?: number;
  /** Elliptic curve name (only used when `type` is `"ecc"`). */
  curve: CurveType;
  /** Key expiration time in seconds from creation (0 = never). */
  keyExpirationTime?: number;
  /** Output format for the generated key material. */
  format: FormatType;
}

/**
 * Request body for the encryption endpoint.
 *
 * @example
 * ```json
 * {
 *   "passphrase": "s3cret",
 *   "message": "Hello, world!",
 *   "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----..."
 * }
 * ```
 */
export interface IBodyEncrypt {
  /** Passphrase to unlock the signing private key (if provided). */
  passphrase: string;
  /** Plaintext message to encrypt. */
  message: string;
  /** Armored PGP public key of the recipient. */
  publicKey: string;
  /** Optional armored PGP private key for sign-and-encrypt. */
  privateKey?: string;
}

/**
 * Request body for the decryption endpoint.
 *
 * @example
 * ```json
 * {
 *   "passphrase": "s3cret",
 *   "message": "-----BEGIN PGP MESSAGE-----...",
 *   "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----...",
 *   "privateKey": "-----BEGIN PGP PRIVATE KEY BLOCK-----..."
 * }
 * ```
 */
export interface IBodyDecrypt {
  /** Passphrase to unlock the private key. */
  passphrase: string;
  /** Armored PGP encrypted message to decrypt. */
  message: string;
  /** Armored PGP public key of the sender (for signature verification). */
  publicKey: string;
  /** Armored PGP private key of the recipient. */
  privateKey: string;
}

/**
 * Request body for the key revocation endpoint.
 *
 * @example
 * ```json
 * {
 *   "passphrase": "s3cret",
 *   "flag": 2,
 *   "reason": "Key compromised"
 * }
 * ```
 */
export interface IBodyRevoke {
  /** Passphrase to unlock the private key being revoked. */
  passphrase: string;
  /** Revocation reason code (0 = no reason, 1 = superseded, 2 = compromised, 3 = retired). */
  flag: number;
  /** Human-readable revocation reason string. */
  reason: string;
}

/**
 * Request body for the signature verification endpoint.
 *
 * @example
 * ```json
 * {
 *   "date": "2026-01-01T00:00:00Z",
 *   "message": "-----BEGIN PGP SIGNED MESSAGE-----...",
 *   "verificationKeys": "-----BEGIN PGP PUBLIC KEY BLOCK-----..."
 * }
 * ```
 */
export interface IBodyVerify {
  /** ISO-8601 date string used as the verification reference time. */
  date: string;
  /** Armored PGP signed message (clear-signed or detached). */
  message: string;
  /** Armored PGP public key(s) to verify the signature against. */
  verificationKeys: string;
}
