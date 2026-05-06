/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Barrel exports for @sebastienrousseau/crypto-middleware.
 */

// Types
export { MiddlewareConfig, JwtPayload, CryptoMiddlewareError } from "./types";

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
