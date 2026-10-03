/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Common cryptographic operations shared by Express and Fastify adapters.
 *
 * Uses crypto-lib's secretbox (XChaCha20-Poly1305) for payload encryption,
 * HMAC-SHA256 for webhook signature verification, and a minimal HMAC-based
 * JWT verification suitable for HS256 tokens.
 */

import {
  secretbox,
  computeHmac,
  verifyHmac,
  timingSafeEqual,
  wipeMemory,
} from "@sebastienrousseau/crypto-lib";
import {
  streamPqEncrypt,
  streamPqDecrypt,
} from "@sebastienrousseau/crypto-lib/streaming";
import { CryptoMiddlewareError, JwtPayload, MiddlewareConfig } from "./types";

/**
 * Encrypt a JSON-serialisable payload using secretbox (XChaCha20-Poly1305).
 *
 * @param key  Hex-encoded 256-bit key.
 * @param data Plaintext payload (will be JSON-stringified if not a string).
 * @returns    Base64-encoded sealed box.
 *
 * @example
 * ```ts
 * const key = "a0b1c2..."; // 64-char hex string (256-bit)
 * const sealed = encryptPayload(key, { userId: 42, role: "admin" });
 * // sealed is a base64-encoded string ready for transport
 * ```
 */
export function encryptPayload(key: string, data: unknown): string {
  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const result = secretbox.seal(key, plaintext);
  return result.sealed;
}

/**
 * Decrypt a sealed-box payload back to its original JSON form.
 *
 * @param key    Hex-encoded 256-bit key.
 * @param sealed Base64-encoded sealed box (nonce || ciphertext || tag).
 * @returns      The decrypted, JSON-parsed payload.
 * @throws       {CryptoMiddlewareError} If decryption or parsing fails.
 *
 * @example
 * ```ts
 * const data = decryptPayload(key, sealed);
 * console.log(data); // { userId: 42, role: "admin" }
 * ```
 */
export function decryptPayload(key: string, sealed: string): unknown {
  try {
    const plainBytes = secretbox.open(key, sealed);
    const plaintext = Buffer.from(plainBytes).toString("utf8");
    return JSON.parse(plaintext);
  } catch (err) {
    throw new CryptoMiddlewareError(
      `Decryption failed: ${(err as Error).message}`,
      400,
      "DECRYPTION_FAILED",
    );
  }
}

/**
 * Encrypt a JSON-serialisable payload using hybrid post-quantum STREAM AEAD
 * (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 *
 * @param recipientX25519Public Hex-encoded recipient X25519 public key.
 * @param recipientMlKemPublic  Hex-encoded recipient ML-KEM-768 public key.
 * @param data                  Plaintext payload.
 * @param chunkSize             Optional chunk size in bytes.
 * @returns                     Base64-encoded hybrid ciphertext.
 */
export function encryptPqPayload(
  recipientX25519Public: string,
  recipientMlKemPublic: string,
  data: unknown,
  chunkSize?: number,
): string {
  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const ptBytes = Buffer.from(plaintext, "utf8");
  const res = streamPqEncrypt({
    recipientX25519Public,
    recipientMlKemPublic,
    plaintext: ptBytes,
    ...(chunkSize !== undefined ? { chunkSize } : {}),
  });
  return Buffer.from(res.ciphertext).toString("base64");
}

/**
 * Decrypt a post-quantum hybrid STREAM payload back to its original JSON form.
 *
 * @param recipientX25519Secret Hex-encoded recipient X25519 secret key.
 * @param recipientMlKemSecret  Hex-encoded recipient ML-KEM-768 secret key.
 * @param sealed                Base64-encoded hybrid ciphertext.
 * @param chunkSize             Optional chunk size in bytes.
 * @returns                     The decrypted, JSON-parsed payload.
 * @throws                      {CryptoMiddlewareError} If decryption or parsing fails.
 */
export function decryptPqPayload(
  recipientX25519Secret: string,
  recipientMlKemSecret: string,
  sealed: string,
  chunkSize?: number,
): unknown {
  try {
    const ctBytes = Buffer.from(sealed, "base64");
    const decrypted = streamPqDecrypt({
      recipientX25519Secret,
      recipientMlKemSecret,
      ciphertext: ctBytes,
      ...(chunkSize !== undefined ? { chunkSize } : {}),
    });
    const plaintext = Buffer.from(decrypted).toString("utf8");
    wipeMemory(decrypted);
    return JSON.parse(plaintext);
  } catch (err) {
    throw new CryptoMiddlewareError(
      `PQ decryption failed: ${(err as Error).message}`,
      400,
      "DECRYPTION_FAILED",
    );
  }
}

/**
 * Verify an HMAC-SHA256 signature from a request header.
 *
 * Expects the signature header to be in one of these forms:
 *   - Raw hex: `a1b2c3...`
 *   - Prefixed: `sha256=a1b2c3...`
 *
 * @param hmacKey   Hex-encoded HMAC key.
 * @param body      The raw request body (string).
 * @param signature The signature header value.
 * @returns         `true` if the signature is valid.
 * @throws          {CryptoMiddlewareError} If the signature is invalid.
 *
 * @example
 * ```ts
 * const sig = req.headers["x-hub-signature-256"] as string;
 * verifyHmacSignature(process.env.HMAC_KEY!, rawBody, sig);
 * // throws CryptoMiddlewareError if the signature is invalid
 * ```
 */
export function verifyHmacSignature(
  hmacKey: string,
  body: string,
  signature: string,
): boolean {
  if (!signature) {
    throw new CryptoMiddlewareError(
      "Missing signature header",
      401,
      "MISSING_SIGNATURE",
    );
  }

  // Strip optional "sha256=" prefix
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;

  const result = verifyHmac({
    algorithm: "sha256",
    key: hmacKey,
    data: body,
    mac: sig,
  });

  if (!result.valid) {
    throw new CryptoMiddlewareError(
      "Invalid HMAC signature",
      401,
      "INVALID_SIGNATURE",
    );
  }

  return true;
}

/**
 * Base64url-decode a string.
 */
function base64urlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

/** Options for {@link verifyJwt}. */
export interface JwtVerifyOptions {
  /**
   * Required `iss` claim. When set, a token with another issuer, or none,
   * is rejected with `INVALID_ISSUER`.
   */
  issuer?: string | undefined;
  /**
   * Required audience. When set, the token's `aud` claim (a string or an
   * array of strings) must contain it, or the token is rejected with
   * `INVALID_AUDIENCE`.
   */
  audience?: string | undefined;
}

/** Throw a 401 {@link CryptoMiddlewareError}. */
function reject(message: string, code: string): never {
  throw new CryptoMiddlewareError(message, 401, code);
}

/** Split a compact JWS into its three base64url parts. */
function splitToken(token: string): [string, string, string] {
  if (!token) reject("Missing JWT token", "MISSING_TOKEN");
  const parts = token.split(".");
  if (parts.length !== 3) {
    reject("Malformed JWT: expected 3 parts", "MALFORMED_TOKEN");
  }
  return parts as [string, string, string];
}

/** Decode one JWT segment as a JSON object, or throw `MALFORMED_TOKEN`. */
function decodeObject(segment: string, name: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(base64urlDecode(segment));
  } catch {
    value = undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    reject(`Malformed JWT ${name}`, "MALFORMED_TOKEN");
  }
  return value as Record<string, unknown>;
}

/** Check `HMAC-SHA256(secret, signingInput)` against the token signature. */
function checkSignature(
  jwtSecret: string,
  signingInput: string,
  signatureB64: string,
): void {
  // The secret may be a plain UTF-8 string; convert to hex for crypto-lib
  const keyHex = Buffer.from(jwtSecret, "utf8").toString("hex");
  const computed = computeHmac({
    algorithm: "sha256",
    key: keyHex,
    data: signingInput,
  });
  // Decode the base64url signature to bytes for comparison
  const sigPadded =
    signatureB64 + "=".repeat((4 - (signatureB64.length % 4)) % 4);
  const signatureBytes = Buffer.from(sigPadded, "base64");
  const computedBytes = Buffer.from(computed.mac, "hex");
  if (!timingSafeEqual(computedBytes, signatureBytes)) {
    reject("Invalid JWT signature", "INVALID_TOKEN");
  }
}

/**
 * Check `exp` (required) and `nbf` (optional). Both must be numbers when
 * present: a token without an expiry would be valid forever.
 */
function checkTimes(payload: JwtPayload): void {
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number") {
    reject("JWT has no numeric exp claim", "MISSING_EXPIRATION");
  }
  if (now >= payload.exp) reject("JWT has expired", "TOKEN_EXPIRED");
  if (payload.nbf === undefined) return;
  if (typeof payload.nbf !== "number") {
    reject("JWT nbf claim is not a number", "MALFORMED_TOKEN");
  }
  if (now < payload.nbf) reject("JWT is not yet valid", "TOKEN_NOT_YET_VALID");
}

/** Check the issuer and audience the caller requires, if any. */
function checkIssuerAudience(
  payload: JwtPayload,
  options: JwtVerifyOptions,
): void {
  if (options.issuer !== undefined && payload.iss !== options.issuer) {
    reject("JWT issuer is not accepted", "INVALID_ISSUER");
  }
  if (options.audience === undefined) return;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(options.audience)) {
    reject("JWT audience is not accepted", "INVALID_AUDIENCE");
  }
}

/**
 * Verify a JWT (HS256 only) using HMAC-SHA256.
 *
 * The algorithm is pinned to HS256: any other `alg`, including `none`, is
 * rejected. The token must carry a numeric `exp` claim; `nbf` is checked
 * when present, and `iss` / `aud` when `options` require them.
 *
 * This is a minimal JWT verifier intended for middleware use cases. For
 * production systems requiring RS256/ES256 or full JOSE support, consider
 * using a dedicated JWT library.
 *
 * @param jwtSecret  The HMAC secret (UTF-8 string or hex-encoded key).
 * @param token      The raw JWT string (header.payload.signature).
 * @param options    Required issuer and audience, if any.
 * @returns          The decoded JWT payload.
 * @throws           {CryptoMiddlewareError} On invalid/expired tokens.
 *
 * @example
 * ```ts
 * const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
 * const payload = verifyJwt("my-hs256-secret", token, {
 *   issuer: "https://auth.example.com",
 *   audience: "orders-api",
 * });
 * console.log(payload.sub); // "user-123"
 * ```
 */
export function verifyJwt(
  jwtSecret: string,
  token: string,
  options: JwtVerifyOptions = {},
): JwtPayload {
  const [headerB64, payloadB64, signatureB64] = splitToken(token);
  const header = decodeObject(headerB64, "header");
  if (header["alg"] !== "HS256") {
    reject(
      `Unsupported JWT algorithm: ${String(header["alg"])}. Only HS256 is supported.`,
      "UNSUPPORTED_ALGORITHM",
    );
  }
  checkSignature(jwtSecret, `${headerB64}.${payloadB64}`, signatureB64);
  const payload = decodeObject(payloadB64, "payload") as JwtPayload;
  checkTimes(payload);
  checkIssuerAudience(payload, options);
  return payload;
}

/**
 * Verify the Bearer token in an `Authorization` header with the JWT
 * settings of a middleware configuration. Shared by the Express and
 * Fastify adapters.
 *
 * @throws {CryptoMiddlewareError} 500 when `jwtSecret` is not configured,
 *   401 when the token is missing or invalid.
 */
export function verifyBearerJwt(
  config: MiddlewareConfig,
  authorization: string | undefined,
): JwtPayload {
  if (!config.jwtSecret) {
    throw new CryptoMiddlewareError(
      "jwtSecret is required for verify-jwt operation",
      500,
      "MISSING_CONFIG",
    );
  }
  const header = authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyJwt(config.jwtSecret, token, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
}

/**
 * Verify the HMAC-SHA256 signature of a request (`x-signature` or
 * `x-hub-signature-256` header) with the `hmacKey` of a middleware
 * configuration. Shared by the Express and Fastify adapters.
 *
 * @throws {CryptoMiddlewareError} 500 when `hmacKey` is not configured,
 *   401 when the signature is missing or invalid.
 */
export function verifyRequestSignature(
  config: MiddlewareConfig,
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
): void {
  if (!config.hmacKey) {
    throw new CryptoMiddlewareError(
      "hmacKey is required for verify-signature operation",
      500,
      "MISSING_CONFIG",
    );
  }
  const signature =
    (headers["x-signature"] as string) ??
    (headers["x-hub-signature-256"] as string) ??
    "";
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  verifyHmacSignature(config.hmacKey, rawBody, signature);
}

/**
 * Match a request path against a list of glob-like route patterns.
 *
 * Supports:
 *   - Exact matches: `/api/data`
 *   - Wildcards: `/api/*` (matches one segment)
 *   - Globstar: `/api/**` (matches any number of segments)
 *
 * @param path    The request path.
 * @param routes  Array of route patterns.
 * @returns       `true` if the path matches any pattern.
 *
 * @example
 * ```ts
 * matchRoute("/api/users/42", ["/api/**"]); // true
 * matchRoute("/health", ["/api/*"]);        // false
 * ```
 */
export function matchRoute(path: string, routes: string[]): boolean {
  if (routes.length === 0) return true; // No routes configured = match all
  for (const pattern of routes) {
    if (pattern === path) return true;
    const regexStr = pattern
      .replace(/\*\*/g, "___GLOBSTAR___")
      .replace(/\*/g, "[^/]+")
      .replace(/___GLOBSTAR___/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    if (regex.test(path)) return true;
  }
  return false;
}
