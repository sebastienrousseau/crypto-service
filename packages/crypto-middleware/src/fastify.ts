/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Fastify plugin adapter.
 *
 * Provides `cryptoPlugin` — a Fastify plugin registered via `fastify-plugin`
 * that hooks into the request/response lifecycle.  Depending on the configured
 * operations it will:
 *
 *   - `decrypt-request`   — decrypt an encrypted JSON body (onRequest hook).
 *   - `encrypt-response`  — encrypt outgoing JSON (preSerialization hook).
 *   - `verify-signature`  — verify HMAC-SHA256 signatures (onRequest hook).
 *   - `verify-jwt`        — verify HS256 JWT Bearer tokens (onRequest hook).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { MiddlewareConfig, CryptoMiddlewareError } from "./types";
import {
  decryptPayload,
  encryptPayload,
  verifyBearerJwt,
  verifyRequestSignature,
  matchRoute,
} from "./common";

/** The configured operations. */
type Operation = NonNullable<MiddlewareConfig["operations"]>[number];

/**
 * Send a {@link CryptoMiddlewareError} as `{ error, code }` with its
 * status; rethrow anything else.
 */
function sendMiddlewareError(reply: FastifyReply, err: unknown): void {
  if (err instanceof CryptoMiddlewareError) {
    reply.code(err.statusCode).send({
      error: err.message,
      code: err.code,
    });
    return;
  }
  throw err;
}

/** onRequest: verify the JWT and the HMAC signature, as configured. */
function registerVerification(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
  operations: readonly Operation[],
  routes: string[],
): void {
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!matchRoute(request.url, routes)) return;

      try {
        // Verify JWT
        if (operations.includes("verify-jwt")) {
          const payload = verifyBearerJwt(opts, request.headers.authorization);
          (request as unknown as Record<string, unknown>).jwtPayload = payload;
        }

        // Verify HMAC signature
        if (operations.includes("verify-signature")) {
          verifyRequestSignature(opts, request.headers, request.body);
        }
      } catch (err) {
        sendMiddlewareError(reply, err);
      }
    },
  );
}

/** preHandler: decrypt an `{ encrypted }` request body. */
function registerDecryption(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
  routes: string[],
): void {
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!matchRoute(request.url, routes)) return;
      if (!opts.key) {
        reply.code(500).send({
          error: "key is required for decrypt-request operation",
          code: "MISSING_CONFIG",
        });
        return;
      }
      try {
        const body = request.body as Record<string, unknown> | undefined;
        if (body && typeof body === "object" && "encrypted" in body) {
          (request as unknown as Record<string, unknown>).body = decryptPayload(
            opts.key,
            body.encrypted as string,
          );
        }
      } catch (err) {
        sendMiddlewareError(reply, err);
      }
    },
  );
}

/** preSerialization: encrypt object and array response bodies. */
function registerEncryption(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
  routes: string[],
): void {
  fastify.addHook(
    "preSerialization",
    async (request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
      if (!matchRoute(request.url, routes)) return payload;
      if (!opts.key) return payload;
      // Only encrypt objects/arrays, not strings (which may already be handled)
      if (payload !== null && typeof payload === "object") {
        const sealed = encryptPayload(opts.key, payload);
        return { encrypted: sealed };
      }
      return payload;
    },
  );
}

/**
 * Fastify plugin that performs cryptographic operations on requests and
 * responses.
 *
 * @example
 * ```ts
 * import Fastify from "fastify";
 * import { cryptoPlugin } from "@sebastienrousseau/crypto-middleware";
 *
 * const app = Fastify();
 * app.register(cryptoPlugin, {
 *   key: process.env.CRYPTO_KEY,
 *   operations: ["decrypt-request", "encrypt-response"],
 * });
 * ```
 */
async function cryptoPluginImpl(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
): Promise<void> {
  const operations = opts.operations ?? [];
  const routes = opts.routes ?? [];

  // --- onRequest: JWT and HMAC verification ---
  registerVerification(fastify, opts, operations, routes);

  // --- preHandler: decrypt request body ---
  if (operations.includes("decrypt-request")) {
    registerDecryption(fastify, opts, routes);
  }

  // --- preSerialization: encrypt response body ---
  if (operations.includes("encrypt-response")) {
    registerEncryption(fastify, opts, routes);
  }
}

/** Fastify plugin wrapping {@link cryptoPluginImpl} via `fastify-plugin`. */
export const cryptoPlugin = fp(cryptoPluginImpl, {
  name: "crypto-middleware",
  fastify: "4.x || 5.x",
});
