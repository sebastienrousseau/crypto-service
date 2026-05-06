/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Custom TypeORM decorator that marks a column as encrypted.
 *
 * Combines TypeORM's `@Column` with `EncryptionTransformer` so that a
 * single decorator handles both the column definition and transparent
 * encrypt/decrypt.
 */

import { Column, type ColumnOptions } from "typeorm";
import { EncryptionTransformer } from "./transformer";
import type { EncryptionConfig } from "./types";

/**
 * Options accepted by the `@EncryptedColumn` decorator.
 *
 * Extends the standard TypeORM `ColumnOptions` with an `encrypt` field
 * that carries the encryption configuration.
 */
export interface EncryptedColumnOptions extends Omit<
  ColumnOptions,
  "transformer"
> {
  /**
   * Encryption configuration. If not provided, the column will fall back
   * to the `TYPEORM_ENCRYPTION_KEY` environment variable.
   */
  encrypt?: EncryptionConfig;
}

/**
 * Property decorator that creates an encrypted TypeORM column.
 *
 * Under the hood it applies a `text` column (to hold the Base64 sealed
 * box) with an `EncryptionTransformer` attached. You can override the
 * column type and any other standard `ColumnOptions`.
 *
 * @example
 * ```ts
 * import { EncryptedColumn } from "@sebastienrousseau/crypto-typeorm";
 *
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id!: number;
 *
 *   @EncryptedColumn({
 *     encrypt: { key: process.env.COLUMN_ENCRYPTION_KEY! },
 *   })
 *   ssn!: string;
 * }
 * ```
 *
 * @param options - Column and encryption options. When `encrypt` is
 *   omitted, the key is read from `process.env.TYPEORM_ENCRYPTION_KEY`.
 */
export function EncryptedColumn(
  options?: EncryptedColumnOptions,
): PropertyDecorator {
  const { encrypt, ...columnOptions } = options ?? {};

  const key = encrypt?.key ?? process.env.TYPEORM_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "EncryptedColumn: encryption key is required. Provide it via " +
        "options.encrypt.key or set the TYPEORM_ENCRYPTION_KEY env var.",
    );
  }

  const config: EncryptionConfig = {
    key,
    algorithm: encrypt?.algorithm,
  };

  const transformer = new EncryptionTransformer(config);

  const merged: ColumnOptions = {
    type: "text",
    ...columnOptions,
    transformer,
  };

  return Column(merged);
}
