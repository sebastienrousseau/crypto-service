/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
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
 * - CRYPTO_API_KEY: Static API key for service-to-service auth
 *
 * If neither is set, all requests are allowed (development mode).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { timingSafeEqual } from "crypto";

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
  "crypto:admin",
] as const;

/** A single authorization scope string from {@link SCOPES}. */
export type Scope = (typeof SCOPES)[number];

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
 * Register JWT plugin and authentication hooks.
 */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  const jwtSecret = process.env["JWT_SECRET"];

  if (jwtSecret) {
    /* c8 ignore next 5 -- @fastify/jwt requires Fastify 5.x; tested via catch */
    const fastifyJwt = await import("@fastify/jwt");
    await app.register(fastifyJwt.default, {
      secret: jwtSecret,
    });
  }
}

/**
 * Authenticate a request. Checks (in order):
 * 1. Bearer JWT token in Authorization header
 * 2. API key in x-api-key header
 * 3. If neither configured, allow all (dev mode)
 *
 * Returns the authenticated payload or sends 401.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthPayload | null> {
  const jwtSecret = process.env["JWT_SECRET"];
  const apiKey = process.env["CRYPTO_API_KEY"];

  // Dev mode: no auth configured
  if (!jwtSecret && !apiKey) {
    return { sub: "anonymous", scopes: ["crypto:admin"] };
  }

  // Try JWT first
  const authHeader = request.headers["authorization"];
  if (authHeader?.startsWith("Bearer ") && jwtSecret) {
    try {
      const decoded = await (
        request as { jwtVerify: () => Promise<AuthPayload> }
      ).jwtVerify();
      return decoded;
    } catch {
      reply.status(401).send({ error: "Invalid or expired JWT token" });
      return null;
    }
  }

  // Fallback to API key
  if (apiKey) {
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

  reply
    .status(401)
    .send({ error: "Unauthorized: No valid credentials provided" });
  return null;
}

/**
 * Check if an authenticated payload has the required scope.
 */
export function hasScope(payload: AuthPayload, required: Scope): boolean {
  return (
    payload.scopes.includes("crypto:admin") || payload.scopes.includes(required)
  );
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
