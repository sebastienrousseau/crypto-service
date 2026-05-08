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
  verifyHmacSignature,
  verifyJwt,
  matchRoute,
} from "./common";

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

  // --- onRequest: JWT, HMAC, and request decryption ---
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!matchRoute(request.url, routes)) return;

      try {
        // Verify JWT
        if (operations.includes("verify-jwt")) {
          if (!opts.jwtSecret) {
            throw new CryptoMiddlewareError(
              "jwtSecret is required for verify-jwt operation",
              500,
              "MISSING_CONFIG",
            );
          }
          const authHeader = request.headers.authorization ?? "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";
          const payload = verifyJwt(opts.jwtSecret, token);
          (request as unknown as Record<string, unknown>).jwtPayload = payload;
        }

        // Verify HMAC signature
        if (operations.includes("verify-signature")) {
          if (!opts.hmacKey) {
            throw new CryptoMiddlewareError(
              "hmacKey is required for verify-signature operation",
              500,
              "MISSING_CONFIG",
            );
          }
          const signature =
            (request.headers["x-signature"] as string) ??
            (request.headers["x-hub-signature-256"] as string) ??
            "";
          const rawBody =
            typeof request.body === "string"
              ? request.body
              : JSON.stringify(request.body);
          verifyHmacSignature(opts.hmacKey, rawBody, signature);
        }
      } catch (err) {
        if (err instanceof CryptoMiddlewareError) {
          reply.code(err.statusCode).send({
            error: err.message,
            code: err.code,
          });
          return;
        }
        throw err;
      }
    },
  );

  // --- preHandler: decrypt request body ---
  if (operations.includes("decrypt-request")) {
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
            (request as unknown as Record<string, unknown>).body =
              decryptPayload(opts.key, body.encrypted as string);
          }
        } catch (err) {
          if (err instanceof CryptoMiddlewareError) {
            reply.code(err.statusCode).send({
              error: err.message,
              code: err.code,
            });
            return;
          }
          throw err;
        }
      },
    );
  }

  // --- preSerialization: encrypt response body ---
  if (operations.includes("encrypt-response")) {
    fastify.addHook(
      "preSerialization",
      async (
        request: FastifyRequest,
        _reply: FastifyReply,
        payload: unknown,
      ) => {
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
}

export const cryptoPlugin = fp(cryptoPluginImpl, {
  name: "crypto-middleware",
  fastify: "4.x",
});
