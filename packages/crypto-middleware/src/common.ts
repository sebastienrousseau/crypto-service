/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Common cryptographic operations shared by Express and Fastify adapters.
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
} from "@sebastienrousseau/crypto-lib";
import { CryptoMiddlewareError, JwtPayload } from "./types";

/**
 * Encrypt a JSON-serialisable payload using secretbox (XChaCha20-Poly1305).
 *
 * @param key  Hex-encoded 256-bit key.
 * @param data Plaintext payload (will be JSON-stringified if not a string).
 * @returns    Base64-encoded sealed box.
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

/**
 * Verify a JWT (HS256 only) using HMAC-SHA256.
 *
 * This is a minimal JWT verifier intended for middleware use cases. For
 * production systems requiring RS256/ES256 or full JOSE support, consider
 * using a dedicated JWT library.
 *
 * @param jwtSecret  The HMAC secret (UTF-8 string or hex-encoded key).
 * @param token      The raw JWT string (header.payload.signature).
 * @returns          The decoded JWT payload.
 * @throws           {CryptoMiddlewareError} On invalid/expired tokens.
 */
export function verifyJwt(jwtSecret: string, token: string): JwtPayload {
  if (!token) {
    throw new CryptoMiddlewareError("Missing JWT token", 401, "MISSING_TOKEN");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new CryptoMiddlewareError(
      "Malformed JWT: expected 3 parts",
      401,
      "MALFORMED_TOKEN",
    );
  }

  const [headerB64, payloadB64, signatureB64] = parts as [
    string,
    string,
    string,
  ];

  // Decode and validate header
  let header: { alg: string; typ?: string };
  try {
    header = JSON.parse(base64urlDecode(headerB64));
  } catch {
    throw new CryptoMiddlewareError(
      "Malformed JWT header",
      401,
      "MALFORMED_TOKEN",
    );
  }

  if (header.alg !== "HS256") {
    throw new CryptoMiddlewareError(
      `Unsupported JWT algorithm: ${header.alg}. Only HS256 is supported.`,
      401,
      "UNSUPPORTED_ALGORITHM",
    );
  }

  // Verify signature: HMAC-SHA256(secret, header.payload)
  const signingInput = `${headerB64}.${payloadB64}`;

  // The secret may be a plain UTF-8 string; convert to hex for crypto-lib
  const keyHex = Buffer.from(jwtSecret, "utf8").toString("hex");

  const computed = computeHmac({
    algorithm: "sha256",
    key: keyHex,
    data: signingInput,
  });

  // Decode the base64url signature to hex for comparison
  const sigPadded =
    signatureB64 + "=".repeat((4 - (signatureB64.length % 4)) % 4);
  const sigHex = Buffer.from(sigPadded, "base64").toString("hex");

  const computedBytes = Buffer.from(computed.mac, "hex");
  const signatureBytes = Buffer.from(sigHex, "hex");

  if (!timingSafeEqual(computedBytes, signatureBytes)) {
    throw new CryptoMiddlewareError(
      "Invalid JWT signature",
      401,
      "INVALID_TOKEN",
    );
  }

  // Decode payload
  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    throw new CryptoMiddlewareError(
      "Malformed JWT payload",
      401,
      "MALFORMED_TOKEN",
    );
  }

  // Check expiration
  if (payload.exp !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) {
      throw new CryptoMiddlewareError("JWT has expired", 401, "TOKEN_EXPIRED");
    }
  }

  // Check not-before
  if (payload.nbf !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    if (now < payload.nbf) {
      throw new CryptoMiddlewareError(
        "JWT is not yet valid",
        401,
        "TOKEN_NOT_YET_VALID",
      );
    }
  }

  return payload;
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
