/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks ValueTransformer that encrypts on write and decrypts on read using
 * crypto-lib's secretbox (XChaCha20-Poly1305).
 */

import { secretbox } from "@sebastienrousseau/crypto-lib";
import type { ValueTransformer } from "typeorm";
import type { EncryptionConfig } from "./types";

/**
 * A TypeORM `ValueTransformer` that transparently encrypts column values
 * before they are persisted and decrypts them when they are loaded.
 *
 * Uses crypto-lib's secretbox (XChaCha20-Poly1305) under the hood: each
 * write generates a fresh random nonce, and the sealed output is stored
 * as a Base64 string in the database.
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
  /** Hex-encoded encryption key. */
  private readonly key: string;

  /** Create a new transformer with the given encryption configuration. */
  constructor(config: EncryptionConfig) {
    if (!config.key) {
      throw new Error("EncryptionTransformer: key is required");
    }
    this.key = config.key;
  }

  /**
   * Encrypt a value before it is written to the database.
   *
   * - `null` / `undefined` values pass through unchanged.
   * - Non-string values are JSON-serialised before encryption.
   * - Returns a Base64-encoded sealed box (nonce + ciphertext + tag).
   */
  to(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const plaintext = typeof value === "string" ? value : JSON.stringify(value);
    const { sealed } = secretbox.seal(this.key, plaintext);
    return sealed;
  }

  /**
   * Decrypt a value after it is read from the database.
   *
   * - `null` / `undefined` values pass through unchanged.
   * - Returns the original plaintext string.
   */
  from(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== "string") {
      return null;
    }
    const plaintext = secretbox.open(this.key, value);
    return Buffer.from(plaintext).toString("utf8");
  }
}
