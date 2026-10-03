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
/**
 * Post-quantum key configuration for hybrid stream encryption/decryption.
 */
export interface PqKeysConfig {
  /** Hex-encoded recipient X25519 secret key (for decryption). */
  recipientX25519Secret?: string | undefined;
  /** Hex-encoded recipient ML-KEM-768 secret key (for decryption). */
  recipientMlKemSecret?: string | undefined;
  /** Hex-encoded recipient X25519 public key (for encryption). */
  recipientX25519Public?: string | undefined;
  /** Hex-encoded recipient ML-KEM-768 public key (for encryption). */
  recipientMlKemPublic?: string | undefined;
}

/**
 * Options for dedicated post-quantum streaming plugins and middleware.
 */
export interface PqStreamPluginConfig {
  /** Recipient key pairs for hybrid stream encryption/decryption. */
  recipientKeys: PqKeysConfig;
  /** Routes to apply middleware to (glob patterns). */
  routes?: string[] | undefined;
  /** Chunk size in bytes for streaming AEAD. */
  chunkSize?: number | undefined;
}

export interface MiddlewareConfig {
  /** Hex-encoded key for payload encryption/decryption. */
  key?: string | undefined;
  /** Routes to apply middleware to (glob patterns). */
  routes?: string[] | undefined;
  /** Operations to perform. */
  operations?: Array<
    | "decrypt-request"
    | "encrypt-response"
    | "verify-signature"
    | "verify-jwt"
    | "pq-decrypt-request"
    | "pq-encrypt-response"
  >;
  /** HMAC key for webhook signature verification (hex-encoded). */
  hmacKey?: string;
  /** HMAC secret for HS256 JWT verification. */
  jwtSecret?: string;
  /** Required JWT `iss` claim for `verify-jwt`; unchecked when unset. */
  jwtIssuer?: string;
  /** Required JWT audience (`aud` claim) for `verify-jwt`; unchecked when unset. */
  jwtAudience?: string;
  /** Post-quantum key pair configuration for PQ stream operations. */
  pqKeys?: PqKeysConfig | undefined;
  /** Chunk size in bytes for streaming encryption/decryption. */
  chunkSize?: number | undefined;
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
  /**
   * Expiration time (Unix timestamp). `verifyJwt` requires it on every
   * token it accepts.
   */
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

  /** Create a new CryptoMiddlewareError with the given message, HTTP status code, and error code. */
  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "CryptoMiddlewareError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
