/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Request body type definitions for the Crypto Server REST API.
 *
 * Routes accept JSON bodies via POST — secrets must not transit in URL
 * headers because every reverse proxy in the chain logs them.
 */

/**
 * Allowed key types for generation.
 */
export const KEY_TYPES = ["ecc", "rsa"] as const;
export type KeyType = typeof KEY_TYPES[number];

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
export type CurveType = typeof CURVE_TYPES[number];

/**
 * Allowed key formats.
 */
export const FORMAT_TYPES = ["armored", "binary", "object"] as const;
export type FormatType = typeof FORMAT_TYPES[number];

/**
 * Allowed revocation flags.
 */
export const REVOCATION_FLAGS = [0, 1, 2, 3] as const;
export type RevocationFlag = typeof REVOCATION_FLAGS[number];

export interface IBodyGenerate {
  name: string;
  email: string;
  type: KeyType;
  passphrase: string;
  rsaBits?: number;
  curve: CurveType;
  keyExpirationTime?: number;
  format: FormatType;
}

export interface IBodyEncrypt {
  passphrase: string;
  message: string;
  publicKey: string;
  privateKey?: string;
}

export interface IBodyDecrypt {
  passphrase: string;
  message: string;
  publicKey: string;
  privateKey: string;
}

export interface IBodyRevoke {
  passphrase: string;
  flag: number;
  reason: string;
}

export interface IBodyVerify {
  date: string;
  message: string;
  verificationKeys: string;
}
