/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Shared types for the crypto-middleware package.
 */

/**
 * Configuration for the crypto middleware.
 *
 * @example
 * ```ts
 * const config: MiddlewareConfig = {
 *   key: process.env.CRYPTO_KEY,
 *   routes: ["/api/**"],
 *   operations: ["decrypt-request", "encrypt-response"],
 * };
 * ```
 */
export interface MiddlewareConfig {
  /** Hex-encoded key for payload encryption/decryption. */
  key?: string;
  /** Routes to apply middleware to (glob patterns). */
  routes?: string[];
  /** Operations to perform. */
  operations?: Array<
    "decrypt-request" | "encrypt-response" | "verify-signature" | "verify-jwt"
  >;
  /** HMAC key for webhook signature verification (hex-encoded). */
  hmacKey?: string;
  /** JWT public key or secret for verification. */
  jwtSecret?: string;
}

/**
 * The result of a JWT verification.
 *
 * @example
 * ```ts
 * const payload: JwtPayload = {
 *   sub: "user-123",
 *   iss: "auth.example.com",
 *   exp: Math.floor(Date.now() / 1000) + 3600,
 * };
 * ```
 */
export interface JwtPayload {
  /** Subject claim. */
  sub?: string;
  /** Issuer claim. */
  iss?: string;
  /** Audience claim. */
  aud?: string | string[];
  /** Expiration time (Unix timestamp). */
  exp?: number;
  /** Not before (Unix timestamp). */
  nbf?: number;
  /** Issued at (Unix timestamp). */
  iat?: number;
  /** JWT ID. */
  jti?: string;
  /** Arbitrary additional claims. */
  [key: string]: unknown;
}

/**
 * Error thrown by crypto middleware operations.
 *
 * @example
 * ```ts
 * throw new CryptoMiddlewareError("Invalid token", 401, "INVALID_TOKEN");
 * ```
 */
export class CryptoMiddlewareError extends Error {
  /** HTTP status code to return. */
  public readonly statusCode: number;
  /** Machine-readable error code. */
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "CryptoMiddlewareError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
