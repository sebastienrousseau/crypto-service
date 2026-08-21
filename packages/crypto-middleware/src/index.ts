/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Barrel exports for @sebastienrousseau/crypto-middleware.
 */

// Types
/** Re-exported middleware configuration and JWT payload types. */
export type { MiddlewareConfig, JwtPayload } from "./types";
export { CryptoMiddlewareError } from "./types";

// Common crypto operations
export {
  encryptPayload,
  decryptPayload,
  verifyHmacSignature,
  verifyJwt,
  matchRoute,
} from "./common";

// Express middleware
export { createCryptoMiddleware } from "./express";

// Fastify plugin
export { cryptoPlugin } from "./fastify";
