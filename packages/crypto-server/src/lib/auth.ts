/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Authentication and authorization module.
 *
 * Supports two authentication modes:
 * 1. JWT Bearer tokens (preferred) — with scope-based authorization
 * 2. API Key (x-api-key header) — backward-compatible fallback
 *
 * Configure via environment variables:
 * - JWT_SECRET: HMAC secret for HS256 JWT validation
 * - JWT_MAX_AGE: maximum token lifetime in seconds (default 3600)
 * - JWT_ISSUER / JWT_AUDIENCE: required `iss` / `aud` (required in
 *   production when JWT_SECRET is set)
 * - CRYPTO_API_KEY: Static API key for service-to-service auth
 *
 * If neither is set, requests are refused unless ALLOW_ANONYMOUS=1.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { timingSafeEqual } from "crypto";
import { anonymousAllowed } from "../utils/validation";
import {
  AUTHENTICATED,
  jwtConfigError,
  jwtPolicy,
  routeRequirement,
} from "../config/auth-policy";

/**
 * Available authorization scopes.
 */
export const SCOPES = [
  "crypto:encrypt",
  "crypto:decrypt",
  "crypto:sign",
  "crypto:verify",
  "crypto:hash",
  "crypto:kdf",
  "crypto:keys",
  "crypto:keys:export",
  "crypto:admin",
] as const;

/** A single authorization scope string from {@link SCOPES}. */
export type Scope = (typeof SCOPES)[number];

/**
 * Scopes `crypto:admin` does not imply: each must be granted explicitly.
 * Exporting a private key is never a side effect of holding an API key or
 * running with anonymous access, both of which hold `crypto:admin`.
 */
export const EXPLICIT_SCOPES: readonly Scope[] = ["crypto:keys:export"];

/** Decoded JWT or synthetic auth payload attached to a request. */
export interface AuthPayload {
  /** Subject identifier (user or service name). */
  sub: string;
  /** Granted authorization scopes. */
  scopes: Scope[];
  /** JWT "issued at" timestamp (epoch seconds). */
  iat?: number;
  /** JWT expiration timestamp (epoch seconds). */
  exp?: number;
}

/**
 * How far in the future a token's `iat` may be, in seconds, to allow for
 * clock skew between the issuer and this server.
 */
const IAT_CLOCK_SKEW_SECONDS = 60;

/**
 * Register the JWT plugin when `JWT_SECRET` is set. Every token must be
 * HS256, carry `exp` and `iat`, be younger than `JWT_MAX_AGE` seconds
 * (default 3600), and match `JWT_ISSUER` / `JWT_AUDIENCE` when those are
 * set. Throws on invalid JWT settings, so a misconfigured server does not
 * start.
 */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) return;

  const configError = jwtConfigError(process.env);
  if (configError) throw new Error(configError);
  const policy = jwtPolicy(process.env);

  const fastifyJwt = await import("@fastify/jwt");
  await app.register(fastifyJwt.default, {
    secret: jwtSecret,
    verify: {
      // Pin the algorithm so a token cannot choose a weaker one.
      algorithms: ["HS256"],
      // fast-jwt skips an absent claim, so required ones are listed here.
      requiredClaims: [
        "exp",
        "iat",
        ...(policy.issuer ? ["iss"] : []),
        ...(policy.audience ? ["aud"] : []),
      ],
      // fast-jwt takes milliseconds and checks it against `iat`.
      maxAge: policy.maxAgeSeconds * 1000,
      ...(policy.issuer ? { allowedIss: policy.issuer } : {}),
      ...(policy.audience ? { allowedAud: policy.audience } : {}),
    },
  });
}

/**
 * Whether a verified token's declared lifetime breaks the policy: `exp`
 * or `iat` missing or not a number, `exp - iat` longer than the maximum
 * age, or `iat` in the future (beyond the clock-skew allowance).
 */
export function exceedsLifetime(
  payload: AuthPayload,
  maxAgeSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const { exp, iat } = payload;
  if (typeof exp !== "number" || typeof iat !== "number") return true;
  return exp - iat > maxAgeSeconds || iat > nowSeconds + IAT_CLOCK_SKEW_SECONDS;
}

/**
 * Verify the Bearer token with @fastify/jwt and the lifetime policy.
 * Sends the 401 and returns null when it is invalid.
 */
async function verifyBearer(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthPayload | null> {
  try {
    const decoded = await (
      request as { jwtVerify: () => Promise<AuthPayload> }
    ).jwtVerify();
    const { maxAgeSeconds } = jwtPolicy(process.env);
    if (exceedsLifetime(decoded, maxAgeSeconds)) {
      throw new Error("token lifetime exceeds JWT_MAX_AGE");
    }
    return decoded;
  } catch {
    reply.status(401).send({ error: "Invalid or expired JWT token" });
    return null;
  }
}

/**
 * Check the `x-api-key` header against the configured key in constant
 * time. Sends the 401 and returns null when it is missing or wrong.
 */
function checkApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  apiKey: string,
): AuthPayload | null {
  const providedKey = request.headers["x-api-key"];
  if (!providedKey || typeof providedKey !== "string") {
    reply
      .status(401)
      .send({ error: "Unauthorized: Missing API key or Bearer token" });
    return null;
  }

  const a = Buffer.from(providedKey);
  const b = Buffer.from(apiKey);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    reply.status(401).send({ error: "Unauthorized: Invalid API key" });
    return null;
  }

  return { sub: "api-key", scopes: ["crypto:admin"] };
}

/**
 * Authenticate a request. Checks (in order):
 * 1. Bearer JWT token in Authorization header
 * 2. API key in x-api-key header
 * 3. If neither configured, allow only with ALLOW_ANONYMOUS=1
 *
 * Returns the authenticated payload or sends 401.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthPayload | null> {
  const jwtSecret = process.env["JWT_SECRET"];
  const apiKey = process.env["CRYPTO_API_KEY"];

  // No credential configured: anonymous only with explicit opt-in.
  if (!jwtSecret && !apiKey) {
    if (anonymousAllowed()) {
      return { sub: "anonymous", scopes: ["crypto:admin"] };
    }
    reply
      .status(401)
      .send({ error: "Unauthorized: authentication is not configured" });
    return null;
  }

  // Try JWT first
  const authHeader = request.headers["authorization"];
  if (authHeader?.startsWith("Bearer ") && jwtSecret) {
    return verifyBearer(request, reply);
  }

  // Fallback to API key
  if (apiKey) {
    return checkApiKey(request, reply, apiKey);
  }

  reply
    .status(401)
    .send({ error: "Unauthorized: No valid credentials provided" });
  return null;
}

/**
 * Check if an authenticated payload has the required scope.
 */
export function hasScope(payload: AuthPayload, required: Scope): boolean {
  // A verified token without a `scopes` array grants nothing.
  const scopes: readonly string[] = Array.isArray(payload.scopes)
    ? payload.scopes
    : [];
  if (scopes.includes(required)) return true;
  return !EXPLICIT_SCOPES.includes(required) && scopes.includes("crypto:admin");
}

/**
 * Authorization guard — rejects with 403 if the scope is not present.
 */
export function requireScope(
  payload: AuthPayload,
  scope: Scope,
  reply: FastifyReply,
): boolean {
  if (!hasScope(payload, scope)) {
    reply.status(403).send({
      error: "Forbidden",
      message: `Missing required scope: ${scope}`,
    });
    return false;
  }
  return true;
}

/**
 * Enforce the central route policy (`ROUTE_SCOPES` in
 * `config/auth-policy.ts`) for an authenticated request. Sends 403 and
 * returns false when the principal lacks the route's scope, or when the
 * route has no policy entry (fail closed). A request that matched no
 * route passes, so the not-found handler can answer 404.
 */
export function authorizeRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: AuthPayload,
): boolean {
  const url = request.routeOptions.url;
  if (url === undefined) return true;
  const required = routeRequirement(request.method, url);
  if (required === undefined) {
    reply.status(403).send({
      error: "Forbidden",
      message: "No access policy is defined for this route",
    });
    return false;
  }
  if (required === AUTHENTICATED) return true;
  return requireScope(payload, required as Scope, reply);
}
