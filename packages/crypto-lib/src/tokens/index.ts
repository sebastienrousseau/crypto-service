/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Token utilities barrel export.
 *
 * - PASETO v4: Platform-Agnostic Security Tokens (local + public)
 * - Key Rotation: Versioned key management for gradual rollover
 */

/* c8 ignore start -- barrel re-exports; actual functions tested in source modules */

export { v4local, v4public, pae } from "./paseto";
export type {
  PasetoLocalEncryptOptions,
  PasetoLocalDecryptOptions,
  PasetoPublicSignOptions,
  PasetoPublicVerifyOptions,
  PasetoToken,
  PasetoPayload,
} from "./paseto";

export {
  createKeyRing,
  rotateKey,
  findKeyByVersion,
  pruneExpiredKeys,
  encryptWithVersion,
  decryptWithVersion,
} from "./key-rotation";
export type { VersionedKey, KeyRing } from "./key-rotation";

/* c8 ignore stop */
