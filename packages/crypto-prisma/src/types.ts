// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Configuration for encrypted fields in a Prisma model.
 *
 * @example
 * ```ts
 * const field: FieldConfig = {
 *   model: "User",
 *   fields: ["email", "ssn", "phone"],
 * };
 * ```
 */
export interface FieldConfig {
  /** The model name (e.g. "User", "Patient"). */
  model: string;
  /** Fields to encrypt (e.g. ["email", "ssn", "phone"]). */
  fields: string[];
}

/**
 * Configuration for the encryption middleware.
 *
 * @example
 * ```ts
 * const config: EncryptionConfig = {
 *   key: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
 *   encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
 *   algorithm: "xchacha20-poly1305",
 *   deterministicFields: ["email"],
 * };
 * ```
 */
export interface EncryptionConfig {
  /** Hex-encoded 256-bit encryption key. */
  key: string;
  /** Models and fields to encrypt. */
  encryptedFields: FieldConfig[];
  /** Encryption algorithm. Default: "xchacha20-poly1305". */
  algorithm?: "xchacha20-poly1305" | "aes-256-gcm";
  /** Whether to use deterministic encryption for searchable fields. */
  deterministicFields?: string[];
}
