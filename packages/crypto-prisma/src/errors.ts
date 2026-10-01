// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Thrown when a stored value in an encrypted field cannot be decrypted:
 * it was tampered with, moved from another model or field, written with
 * another key, or is not a ciphertext at all.
 *
 * The message names the model and field only; it never includes the
 * stored value.
 *
 * @example
 * ```ts
 * try {
 *   await prisma.user.findUnique({ where: { id: 1 } });
 * } catch (err) {
 *   if (err instanceof FieldDecryptionError) {
 *     console.error(`cannot decrypt ${err.model}.${err.field}`);
 *   }
 * }
 * ```
 */
export class FieldDecryptionError extends Error {
  /** Model the value was read from. */
  readonly model: string;
  /** Field the value was read from. */
  readonly field: string;

  /** Create an error for the given model and field. */
  constructor(model: string, field: string) {
    super(`Cannot decrypt ${model}.${field}: not a valid ciphertext`);
    this.name = "FieldDecryptionError";
    this.model = model;
    this.field = field;
  }
}
