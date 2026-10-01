/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Custom TypeORM decorator that marks a column as encrypted.
 *
 * Combines TypeORM's `@Column` with `EncryptionTransformer` so that a
 * single decorator handles both the column definition and transparent
 * encrypt/decrypt.
 */

import { Column } from "typeorm";
import type { ColumnOptions } from "typeorm";
import { createColumnCodec } from "./codec";
import { EncryptionTransformer } from "./transformer";
import type { EncryptionConfig } from "./types";

/**
 * Options accepted by the `@EncryptedColumn` decorator.
 *
 * Extends the standard TypeORM `ColumnOptions` with an `encrypt` field
 * that carries the encryption configuration.
 *
 * @example
 * ```ts
 * const opts: EncryptedColumnOptions = {
 *   encrypt: { key: process.env.COLUMN_ENCRYPTION_KEY! },
 *   nullable: true,
 * };
 * ```
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
 * Under the hood it applies a `text` column (to hold the `v2:` Base64
 * sealed box) with an `EncryptionTransformer` attached. Each value is
 * bound to `ClassName.property` as associated data, so it cannot be
 * swapped into another encrypted column; set `encrypt.context` to pin
 * the context explicitly (for example when a bundler renames classes).
 * You can override the column type and any other standard
 * `ColumnOptions`.
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

  const config: EncryptionConfig = { ...encrypt, key };
  // Fail at decoration time, not at the first read or write.
  createColumnCodec(config, "EncryptedColumn");

  return (target: object, propertyKey: string | symbol): void => {
    const transformer = new EncryptionTransformer({
      ...config,
      context:
        encrypt?.context ?? `${target.constructor.name}.${String(propertyKey)}`,
    });
    Column({ type: "text", ...columnOptions, transformer })(
      target,
      propertyKey,
    );
  };
}
