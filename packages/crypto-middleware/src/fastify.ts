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
import {
  MiddlewareConfig,
  CryptoMiddlewareError,
  PqStreamPluginConfig,
} from "./types";
import {
  decryptPayload,
  encryptPayload,
  decryptPqPayload,
  encryptPqPayload,
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

/** preHandler: decrypt an `{ encrypted }` request body using post-quantum hybrid STREAM AEAD. */
function registerPqDecryption(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
  routes: string[],
): void {
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!matchRoute(request.url, routes)) return;
      const xSecret = opts.pqKeys?.recipientX25519Secret;
      const kemSecret = opts.pqKeys?.recipientMlKemSecret;
      if (!xSecret || !kemSecret) {
        reply.code(500).send({
          error:
            "recipientX25519Secret and recipientMlKemSecret are required for pq-decrypt-request operation",
          code: "MISSING_CONFIG",
        });
        return;
      }
      try {
        const body = request.body as Record<string, unknown> | undefined;
        if (body && typeof body === "object" && "encrypted" in body) {
          (request as unknown as Record<string, unknown>).body =
            decryptPqPayload(
              xSecret,
              kemSecret,
              body.encrypted as string,
              opts.chunkSize,
            );
        }
      } catch (err) {
        sendMiddlewareError(reply, err);
      }
    },
  );
}

/** preSerialization: encrypt object and array response bodies using post-quantum hybrid STREAM AEAD. */
function registerPqEncryption(
  fastify: FastifyInstance,
  opts: MiddlewareConfig,
  routes: string[],
): void {
  fastify.addHook(
    "preSerialization",
    async (request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
      if (!matchRoute(request.url, routes)) return payload;
      const xPublic = opts.pqKeys?.recipientX25519Public;
      const kemPublic = opts.pqKeys?.recipientMlKemPublic;
      if (!xPublic || !kemPublic) return payload;
      if (payload !== null && typeof payload === "object") {
        const sealed = encryptPqPayload(
          xPublic,
          kemPublic,
          payload,
          opts.chunkSize,
        );
        return {
          encrypted: sealed,
          algorithm: "X25519-ML-KEM-768-XChaCha20-Poly1305",
        };
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

  // --- preHandler: decrypt PQ request body ---
  if (operations.includes("pq-decrypt-request")) {
    registerPqDecryption(fastify, opts, routes);
  }

  // --- preSerialization: encrypt response body ---
  if (operations.includes("encrypt-response")) {
    registerEncryption(fastify, opts, routes);
  }

  // --- preSerialization: encrypt PQ response body ---
  if (operations.includes("pq-encrypt-response")) {
    registerPqEncryption(fastify, opts, routes);
  }
}

/** Fastify plugin wrapping {@link cryptoPluginImpl} via `fastify-plugin`. */
export const cryptoPlugin = fp(cryptoPluginImpl, {
  name: "crypto-middleware",
  fastify: "4.x || 5.x",
});

/** Fastify plugin implementation dedicated to post-quantum hybrid stream encryption/decryption. */
async function pqStreamPluginImpl(
  fastify: FastifyInstance,
  opts: PqStreamPluginConfig,
): Promise<void> {
  const routes = opts.routes ?? [];
  const { recipientKeys, chunkSize } = opts;
  const config: MiddlewareConfig = {
    pqKeys: recipientKeys,
    ...(chunkSize !== undefined ? { chunkSize } : {}),
  };
  if (
    recipientKeys.recipientX25519Secret &&
    recipientKeys.recipientMlKemSecret
  ) {
    registerPqDecryption(fastify, config, routes);
  }
  if (
    recipientKeys.recipientX25519Public &&
    recipientKeys.recipientMlKemPublic
  ) {
    registerPqEncryption(fastify, config, routes);
  }
}

/** Fastify plugin dedicated to post-quantum hybrid stream encryption/decryption. */
export const pqStreamPlugin = fp(pqStreamPluginImpl, {
  name: "crypto-middleware-pq-stream",
  fastify: "4.x || 5.x",
});
