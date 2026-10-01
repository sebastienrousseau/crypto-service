/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Startup checks for authentication settings, kept separate from
 * `env.ts` (which loads configuration at import time) so they can be tested
 * in isolation, and the central route-to-scope authorization policy.
 */

import { isProbePath } from "./constants";

/** Minimum JWT HMAC secret length in bytes (HS256 key size). */
const MIN_JWT_SECRET_BYTES = 32;

/** Default maximum JWT lifetime in seconds (one hour). */
export const DEFAULT_JWT_MAX_AGE_SECONDS = 3600;

/** The claims checks applied to every JWT, from the environment. */
export interface JwtPolicy {
  /**
   * Maximum token lifetime in seconds (`JWT_MAX_AGE`): a token must be
   * younger than this (by `iat`) and must not declare a longer lifetime
   * (`exp - iat`).
   */
  readonly maxAgeSeconds: number;
  /** Required `iss` claim (`JWT_ISSUER`), or undefined to skip the check. */
  readonly issuer: string | undefined;
  /** Required `aud` value (`JWT_AUDIENCE`), or undefined to skip the check. */
  readonly audience: string | undefined;
}

/**
 * Check the JWT settings. `JWT_MAX_AGE`, when set, must be a positive
 * integer number of seconds. With `JWT_SECRET` set, production also
 * requires `JWT_ISSUER` and `JWT_AUDIENCE`, so a token minted for another
 * service that shares the secret is not accepted.
 */
export function jwtConfigError(env: NodeJS.ProcessEnv): string | null {
  const maxAge = env["JWT_MAX_AGE"];
  if (maxAge && !/^[1-9]\d{0,8}$/.test(maxAge)) {
    return "JWT_MAX_AGE must be a positive integer number of seconds";
  }
  const pinned = Boolean(env["JWT_ISSUER"] && env["JWT_AUDIENCE"]);
  if (env["NODE_ENV"] === "production" && env["JWT_SECRET"] && !pinned) {
    return "Production with JWT_SECRET requires JWT_ISSUER and JWT_AUDIENCE";
  }
  return null;
}

/**
 * The JWT policy from the environment. Call {@link jwtConfigError} first:
 * this assumes the settings are valid. Empty values count as unset.
 */
export function jwtPolicy(env: NodeJS.ProcessEnv): JwtPolicy {
  const maxAge = env["JWT_MAX_AGE"];
  return {
    maxAgeSeconds: maxAge ? Number(maxAge) : DEFAULT_JWT_MAX_AGE_SECONDS,
    issuer: env["JWT_ISSUER"] || undefined,
    audience: env["JWT_AUDIENCE"] || undefined,
  };
}

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
  const jwtError = jwtConfigError(env);
  if (jwtError) return jwtError;
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

/**
 * Marks a route that any authenticated principal may call: it returns
 * static, non-secret service metadata and performs no cryptographic
 * operation.
 */
export const AUTHENTICATED = "authenticated";

/**
 * The central route-to-scope policy, keyed by `"<METHOD> <route pattern>"`
 * exactly as the route is registered. Each value is one authorization
 * scope from `SCOPES` in `lib/auth.ts`, or {@link AUTHENTICATED}.
 *
 * The server enforces it on every authenticated request and refuses to
 * boot when a non-public route has no entry, so a new route cannot ship
 * without an explicit decision. `crypto:admin` satisfies every scope.
 */
export const ROUTE_SCOPES: Readonly<Record<string, string>> = Object.freeze({
  // Service metadata
  "GET /": AUTHENTICATED,
  "GET /v2/algorithms": AUTHENTICATED,
  "GET /v2/compliance/dora": AUTHENTICATED,
  "GET /v2/compliance/cbom": AUTHENTICATED,
  // CORS preflight, added by @fastify/cors.
  "OPTIONS *": AUTHENTICATED,
  // v1 (OpenPGP)
  "POST /v1/encrypt": "crypto:encrypt",
  "POST /v1/decrypt": "crypto:decrypt",
  "POST /v1/verify": "crypto:verify",
  "POST /v1/generate": "crypto:keys",
  // Revokes the server's own key pair and rewrites its key files.
  "POST /v1/revoke": "crypto:admin",
  // Encryption
  "POST /v2/encrypt": "crypto:encrypt",
  "POST /v2/secretbox/seal": "crypto:encrypt",
  "POST /v2/sealedbox/seal": "crypto:encrypt",
  "POST /v2/sealedbox/seal-pq": "crypto:encrypt",
  "POST /v2/password/encrypt": "crypto:encrypt",
  "POST /v2/multi-recipient/encrypt": "crypto:encrypt",
  "POST /v2/pq/encapsulate": "crypto:encrypt",
  "POST /v2/pq/hybrid/encapsulate": "crypto:encrypt",
  // Decryption
  "POST /v2/decrypt": "crypto:decrypt",
  "POST /v2/secretbox/open": "crypto:decrypt",
  "POST /v2/sealedbox/open": "crypto:decrypt",
  "POST /v2/sealedbox/open-pq": "crypto:decrypt",
  "POST /v2/password/decrypt": "crypto:decrypt",
  "POST /v2/pq/decapsulate": "crypto:decrypt",
  "POST /v2/pq/hybrid/decapsulate": "crypto:decrypt",
  // Signing (an HMAC is a symmetric authentication tag)
  "POST /v2/sign": "crypto:sign",
  "POST /v2/stream/sign": "crypto:sign",
  "POST /v2/pq/dsa/sign": "crypto:sign",
  "POST /v2/pq/slh-dsa/sign": "crypto:sign",
  "POST /v2/hmac": "crypto:sign",
  // Verification
  "POST /v2/verify": "crypto:verify",
  "POST /v2/stream/verify": "crypto:verify",
  "POST /v2/stream/iso20022": "crypto:verify",
  "POST /v2/pq/dsa/verify": "crypto:verify",
  "POST /v2/pq/slh-dsa/verify": "crypto:verify",
  "POST /v2/hmac/verify": "crypto:verify",
  // Hashing and key derivation
  "POST /v2/hash": "crypto:hash",
  "POST /v2/kdf": "crypto:kdf",
  "POST /v2/password/hash": "crypto:kdf",
  "POST /v2/password/verify": "crypto:kdf",
  // Key management
  "POST /v2/keys/generate": "crypto:keys",
  "POST /v2/keys/wrap": "crypto:keys",
  "POST /v2/keys/unwrap": "crypto:keys",
  "POST /v2/pq/keygen": "crypto:keys",
  "POST /v2/pq/hybrid/keygen": "crypto:keys",
  "POST /v2/pq/dsa/keygen": "crypto:keys",
  "POST /v2/pq/slh-dsa/keygen": "crypto:keys",
});

/**
 * Whether a URL is public (no authentication, no authorization): the
 * health, liveness, readiness and metrics probes and the API docs.
 */
export function isPublicRoute(url: string): boolean {
  return isProbePath(url) || url.startsWith("/docs");
}

/**
 * The requirement for a registered route, or `undefined` when the policy
 * has no entry. `HEAD` routes (generated for every `GET`) follow `GET`.
 */
export function routeRequirement(
  method: string,
  url: string,
): string | undefined {
  const verb = method === "HEAD" ? "GET" : method;
  return ROUTE_SCOPES[`${verb} ${url}`];
}

/** A registered route, as Fastify's `onRoute` hook reports it. */
export interface RegisteredRoute {
  /** HTTP method or methods. */
  method: string | string[];
  /** Route pattern. */
  url: string;
}

/**
 * The non-public routes the policy does not cover, as `"<METHOD> <url>"`
 * strings. An empty list means every route has an explicit requirement.
 */
export function unmappedRoutes(routes: readonly RegisteredRoute[]): string[] {
  const missing: string[] = [];
  for (const route of routes) {
    if (isPublicRoute(route.url)) continue;
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      if (routeRequirement(method, route.url) === undefined) {
        missing.push(`${method} ${route.url}`);
      }
    }
  }
  return missing;
}

/**
 * Throw when a non-public route has no entry in the route policy. The
 * server calls this at boot, so no route ships without an explicit
 * authorization decision.
 */
export function assertRoutesCovered(routes: readonly RegisteredRoute[]): void {
  const missing = unmappedRoutes(routes);
  if (missing.length > 0) {
    throw new Error(
      `Routes without an authorization policy: ${missing.join(", ")}`,
    );
  }
}
