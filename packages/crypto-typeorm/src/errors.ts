/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Thrown when a stored column value cannot be decrypted: it was tampered
 * with, moved from another column or entity, written with another key,
 * or is not a ciphertext at all.
 *
 * The message names the column context only; it never includes the
 * stored value.
 *
 * @example
 * ```ts
 * try {
 *   await repo.findOneBy({ id: 1 });
 * } catch (err) {
 *   if (err instanceof FieldDecryptionError) {
 *     console.error(`cannot decrypt ${err.context}`);
 *   }
 * }
 * ```
 */
export class FieldDecryptionError extends Error {
  /** Column context (`Entity.property`) the value was read for. */
  readonly context: string;

  /** Create an error for the given column context. */
  constructor(context: string) {
    super(`Cannot decrypt ${context || "column"}: not a valid ciphertext`);
    this.name = "FieldDecryptionError";
    this.context = context;
  }
}
