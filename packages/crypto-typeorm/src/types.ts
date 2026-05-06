/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Configuration for column-level encryption.
 *
 * @example
 * ```ts
 * const config: EncryptionConfig = {
 *   key: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
 *   algorithm: "xchacha20-poly1305",
 * };
 * ```
 */
export interface EncryptionConfig {
  /**
   * 256-bit encryption key as a 64-character hex string or 32-byte
   * `Uint8Array`. Used for XChaCha20-Poly1305 secretbox operations.
   */
  key: string;

  /**
   * Algorithm identifier. Currently only `"xchacha20-poly1305"` is supported.
   * Reserved for future algorithm additions.
   *
   * @default "xchacha20-poly1305"
   */
  algorithm?: string;

  /**
   * Per-entity field mapping. Keys are entity names, values are arrays of
   * property names that should be encrypted. Used by `EncryptionSubscriber`
   * to know which fields to process automatically.
   *
   * @example
   * ```ts
   * fields: new Map([
   *   ["User", ["ssn", "email"]],
   *   ["Payment", ["cardNumber"]],
   * ])
   * ```
   */
  fields?: Map<string, string[]>;
}
