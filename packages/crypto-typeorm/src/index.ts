/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Barrel exports for @sebastienrousseau/crypto-typeorm.
 *
 * TypeORM column-level encryption with a single decorator, powered by
 * crypto-lib's secretbox (XChaCha20-Poly1305).
 *
 * @packageDocumentation
 */

export { EncryptedColumn } from "./decorator";
export type { EncryptedColumnOptions } from "./decorator";

export { EncryptionSubscriber } from "./subscriber";

export { EncryptionTransformer } from "./transformer";

export type { EncryptionConfig } from "./types";
