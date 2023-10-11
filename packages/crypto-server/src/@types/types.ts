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
 *
 * @remarks
 * - `type`, `curve`, and `format` are set to any to accommodate various possible types.
 * - Consider refining the types or using enums if a finite set of values are possible.
 *
 * @todo Consider replacing `any` types with specific types or enums.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
export interface IHeadersGenerate {
  date: Date;
  name: string;
  email: string;
  userIDs: Array<{
    name: string;
    email: string;
  }>;
  type: any;
  passphrase: string;
  rsaBits: number;
  curve: any;
  keyExpirationTime: number;
  format: any;
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
 */
export interface IHeadersRevoke {
  passphrase: string;
  flag: number;
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
