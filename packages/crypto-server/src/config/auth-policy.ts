/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Startup checks for authentication settings, kept separate from
 * `env.ts` (which loads configuration at import time) so they can be tested
 * in isolation.
 */

/** Minimum JWT HMAC secret length in bytes (HS256 key size). */
const MIN_JWT_SECRET_BYTES = 32;

/**
 * Check the authentication settings. Returns an error message, or `null`
 * when they are acceptable.
 *
 * Production must configure a credential (`CRYPTO_API_KEY` or
 * `JWT_SECRET`) or opt in to anonymous access explicitly with
 * `ALLOW_ANONYMOUS=1` (for example behind an authenticating gateway).
 */
export function authConfigError(env: NodeJS.ProcessEnv): string | null {
  const jwtSecret = env["JWT_SECRET"];
  if (jwtSecret && Buffer.byteLength(jwtSecret) < MIN_JWT_SECRET_BYTES) {
    return `JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes`;
  }
  const hasCredential = Boolean(env["CRYPTO_API_KEY"] || jwtSecret);
  if (
    env["NODE_ENV"] === "production" &&
    !hasCredential &&
    env["ALLOW_ANONYMOUS"] !== "1"
  ) {
    return "Production requires CRYPTO_API_KEY or JWT_SECRET (or ALLOW_ANONYMOUS=1 behind an authenticating gateway)";
  }
  return null;
}
