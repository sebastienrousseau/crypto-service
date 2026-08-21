// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Barrel export for crypto-prisma.
 *
 * Transparent field-level encryption for Prisma ORM, powered by
 * XChaCha20-Poly1305 and HMAC-SHA-256.
 */

export { createEncryptionMiddleware } from "./middleware";
/** Re-exported middleware types from the middleware module. */
export type {
  PrismaMiddleware,
  MiddlewareParams,
  MiddlewareNext,
} from "./middleware";

export { createFieldEncryptionExtension } from "./extension";
/** Re-exported field encryption extension interface. */
export type { FieldEncryptionExtension } from "./extension";

/** Re-exported encryption configuration and field config types. */
export type { EncryptionConfig, FieldConfig } from "./types";
