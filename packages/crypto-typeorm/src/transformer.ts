/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks ValueTransformer that encrypts on write and decrypts on read using
 * crypto-lib's secretbox (XChaCha20-Poly1305).
 */

import type { ValueTransformer } from "typeorm";
import {
  createColumnCodec,
  openColumn,
  sealColumn,
  type ColumnCodec,
} from "./codec";
import type { EncryptionConfig } from "./types";

/**
 * A TypeORM `ValueTransformer` that transparently encrypts column values
 * before they are persisted and decrypts them when they are loaded.
 *
 * Uses crypto-lib's secretbox (XChaCha20-Poly1305) under the hood: each
 * write generates a fresh random nonce, and the output is stored as
 * `"v2:" + Base64(nonce || ciphertext || tag)`, bound to `config.context`
 * as associated data.
 *
 * @example
 * ```ts
 * import { EncryptionTransformer } from "@sebastienrousseau/crypto-typeorm";
 *
 * const transformer = new EncryptionTransformer({
 *   key: process.env.COLUMN_ENCRYPTION_KEY!,
 * });
 *
 * @Entity()
 * class User {
 *   @Column({ type: "text", transformer })
 *   ssn!: string;
 * }
 * ```
 */
export class EncryptionTransformer implements ValueTransformer {
  /** Derived keys and read options. */
  private readonly codec: ColumnCodec;
  /** Column context bound into each ciphertext. */
  private readonly context: string;

  /**
   * Create a new transformer with the given encryption configuration.
   *
   * @throws If the key is missing or not a 64-character hex string.
   */
  constructor(config: EncryptionConfig) {
    if (!config.key) {
      throw new Error("EncryptionTransformer: key is required");
    }
    this.codec = createColumnCodec(config);
    this.context = config.context ?? "";
  }

  /**
   * Encrypt a value before it is written to the database.
   *
   * - `null` / `undefined` values pass through unchanged.
   * - Non-string values are JSON-serialised before encryption.
   * - Returns `"v2:"` followed by the Base64 sealed box
   *   (nonce + ciphertext + tag).
   */
  to(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const plaintext = typeof value === "string" ? value : JSON.stringify(value);
    return sealColumn(this.codec, this.context, plaintext);
  }

  /**
   * Decrypt a value after it is read from the database.
   *
   * - `null` / `undefined` values pass through unchanged.
   * - Returns the original plaintext string.
   *
   * @throws `FieldDecryptionError` when the value is not a valid
   *   ciphertext for this context (tampered, moved from another column,
   *   or plaintext) and no opt-in fallback applies.
   */
  from(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== "string") {
      return null;
    }
    return openColumn(this.codec, this.context, value);
  }
}
