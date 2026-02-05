/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Definitions of various TypeScript interfaces to type headers and query strings.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

/**
 * Allowed key types for generation
 */
export const KEY_TYPES = ['ecc', 'rsa'] as const;
export type KeyType = typeof KEY_TYPES[number];

/**
 * Allowed curve types for ECC keys
 */
export const CURVE_TYPES = [
  'curve25519',
  'ed25519',
  'p256',
  'p384',
  'p521',
  'secp256k1',
  'brainpoolP256r1',
  'brainpoolP384r1',
  'brainpoolP512r1'
] as const;
export type CurveType = typeof CURVE_TYPES[number];

/**
 * Allowed key formats
 */
export const FORMAT_TYPES = ['armored', 'binary', 'object'] as const;
export type FormatType = typeof FORMAT_TYPES[number];

/**
 * Allowed revocation flags
 */
export const REVOCATION_FLAGS = [0, 1, 2, 3] as const;
export type RevocationFlag = typeof REVOCATION_FLAGS[number];

/**
 * @interface IQuerystring
 * Represents the structure for query strings with username and password.
 */
export interface IQuerystring {
  username: string;
  password: string;
}

/**
 * @interface IHeadersGenerate
 * Represents the structure for headers used in key generation.
 */
export interface IHeadersGenerate {
  date: Date;
  name: string;
  email: string;
  userIDs: Array<{
    name: string;
    email: string;
  }>;
  type: KeyType;
  passphrase: string;
  rsaBits: number;
  curve: CurveType;
  keyExpirationTime: number;
  format: FormatType;
}

/**
 * @interface IHeadersEncrypt
 * Represents the structure for headers used in encryption.
 */
export interface IHeadersEncrypt {
  passphrase: string;
  message: string;
  publicKey: string;
}

/**
 * @interface IHeadersDecrypt
 * Represents the structure for headers used in decryption.
 */
export interface IHeadersDecrypt {
  passphrase: string;
  message: string;
  publicKey: string;
}

/**
 * @interface IHeadersRevoke
 * Represents the structure for headers used in key revocation.
 * Note: flag is a string in HTTP headers and will be parsed to number.
 */
export interface IHeadersRevoke {
  passphrase: string;
  flag: string;
  reason: string;
}

/**
 * @interface IHeadersVerify
 * Represents the structure for headers used in verification.
 */
export interface IHeadersVerify {
  date: string;
  message: string;
  verificationKeys: string;
}
