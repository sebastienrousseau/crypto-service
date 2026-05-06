// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Barrel export for crypto-prisma.
 *
 * Transparent field-level encryption for Prisma ORM, powered by
 * XChaCha20-Poly1305 and HMAC-SHA-256.
 */

export { createEncryptionMiddleware } from "./middleware";
export type { PrismaMiddleware } from "./middleware";

export { createFieldEncryptionExtension } from "./extension";
export type { FieldEncryptionExtension } from "./extension";

export type { EncryptionConfig, FieldConfig } from "./types";
