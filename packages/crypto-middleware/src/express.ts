/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Express middleware adapter.
 *
 * Provides `createCryptoMiddleware(config)` which returns standard Express
 * middleware (`(req, res, next) => void`).  Depending on the configured
 * operations it will:
 *
 *   - `decrypt-request`   — decrypt an encrypted JSON body before handlers.
 *   - `encrypt-response`  — encrypt outgoing JSON responses.
 *   - `verify-signature`  — verify HMAC-SHA256 webhook signatures.
 *   - `verify-jwt`        — verify HS256 JWT Bearer tokens.
 */

import type { Request, Response, NextFunction } from "express";
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

/** The configured operations, in the order the middleware applies them. */
type Operation = NonNullable<MiddlewareConfig["operations"]>[number];

/** The payload key, or a 500 error naming the operation that needs it. */
function requireKey(config: MiddlewareConfig, operation: Operation): string {
  if (!config.key) {
    throw new CryptoMiddlewareError(
      `key is required for ${operation} operation`,
      500,
      "MISSING_CONFIG",
    );
  }
  return config.key;
}

/** Replace an `{ encrypted }` request body with its decrypted payload. */
function decryptBody(config: MiddlewareConfig, req: Request): void {
  const key = requireKey(config, "decrypt-request");
  if (req.body && typeof req.body === "object" && "encrypted" in req.body) {
    req.body = decryptPayload(key, req.body.encrypted as string);
  }
}

/** Make `res.json()` send `{ encrypted }` instead of the plain body. */
function encryptJsonResponses(config: MiddlewareConfig, res: Response): void {
  const key = requireKey(config, "encrypt-response");
  const originalJson = res.json.bind(res);
  res.json = function encryptedJson(body: unknown): Response {
    const sealed = encryptPayload(key, body);
    return originalJson({ encrypted: sealed });
  };
}

/** Replace an `{ encrypted }` request body with its decrypted post-quantum hybrid STREAM payload. */
function decryptPqBody(config: MiddlewareConfig, req: Request): void {
  const xSecret = config.pqKeys?.recipientX25519Secret;
  const kemSecret = config.pqKeys?.recipientMlKemSecret;
  if (!xSecret || !kemSecret) {
    throw new CryptoMiddlewareError(
      "recipientX25519Secret and recipientMlKemSecret are required for pq-decrypt-request operation",
      500,
      "MISSING_CONFIG",
    );
  }
  if (req.body && typeof req.body === "object" && "encrypted" in req.body) {
    req.body = decryptPqPayload(
      xSecret,
      kemSecret,
      req.body.encrypted as string,
      config.chunkSize,
    );
  }
}

/** Make `res.json()` send post-quantum hybrid STREAM `{ encrypted, algorithm }` instead of plain body. */
function encryptPqJsonResponses(config: MiddlewareConfig, res: Response): void {
  const xPublic = config.pqKeys?.recipientX25519Public;
  const kemPublic = config.pqKeys?.recipientMlKemPublic;
  if (!xPublic || !kemPublic) {
    throw new CryptoMiddlewareError(
      "recipientX25519Public and recipientMlKemPublic are required for pq-encrypt-response operation",
      500,
      "MISSING_CONFIG",
    );
  }
  const originalJson = res.json.bind(res);
  res.json = function encryptedPqJson(body: unknown): Response {
    const sealed = encryptPqPayload(xPublic, kemPublic, body, config.chunkSize);
    return originalJson({
      encrypted: sealed,
      algorithm: "X25519-ML-KEM-768-XChaCha20-Poly1305",
    });
  };
}

/**
 * Apply the configured operations to one request. Throws a
 * {@link CryptoMiddlewareError} when one fails.
 */
function applyOperations(
  config: MiddlewareConfig,
  operations: readonly Operation[],
  req: Request,
  res: Response,
): void {
  if (operations.includes("verify-jwt")) {
    // Attach decoded JWT payload to the request
    (req as unknown as Record<string, unknown>).jwtPayload = verifyBearerJwt(
      config,
      req.headers.authorization,
    );
  }
  if (operations.includes("verify-signature")) {
    verifyRequestSignature(config, req.headers, req.body);
  }
  if (operations.includes("decrypt-request")) decryptBody(config, req);
  if (operations.includes("pq-decrypt-request")) decryptPqBody(config, req);
  if (operations.includes("encrypt-response")) {
    encryptJsonResponses(config, res);
  }
  if (operations.includes("pq-encrypt-response")) {
    encryptPqJsonResponses(config, res);
  }
}

/**
 * Create Express middleware that performs cryptographic operations on
 * requests and responses.
 *
 * @param config  Middleware configuration (key, routes, operations, etc.).
 * @returns       Express middleware function.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { createCryptoMiddleware } from "@sebastienrousseau/crypto-middleware";
 *
 * const app = express();
 * app.use(express.json());
 * app.use(createCryptoMiddleware({
 *   key: process.env.CRYPTO_KEY,
 *   operations: ["decrypt-request", "encrypt-response"],
 * }));
 * ```
 */
export function createCryptoMiddleware(config: MiddlewareConfig) {
  const operations = config.operations ?? [];
  const routes = config.routes ?? [];

  return function cryptoMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // Check route match
    if (!matchRoute(req.path, routes)) {
      next();
      return;
    }

    try {
      applyOperations(config, operations, req, res);
      next();
    } catch (err) {
      if (err instanceof CryptoMiddlewareError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  };
}

/**
 * Create Express middleware dedicated to post-quantum hybrid stream encryption/decryption.
 *
 * @param config PQ streaming configuration with recipient key pairs and optional routes.
 * @returns      Express middleware function.
 */
export function createPqStreamMiddleware(config: PqStreamPluginConfig) {
  const operations: ("pq-decrypt-request" | "pq-encrypt-response")[] = [];
  if (
    config.recipientKeys.recipientX25519Secret &&
    config.recipientKeys.recipientMlKemSecret
  ) {
    operations.push("pq-decrypt-request");
  }
  if (
    config.recipientKeys.recipientX25519Public &&
    config.recipientKeys.recipientMlKemPublic
  ) {
    operations.push("pq-encrypt-response");
  }
  return createCryptoMiddleware({
    pqKeys: config.recipientKeys,
    ...(config.routes !== undefined ? { routes: config.routes } : {}),
    ...(config.chunkSize !== undefined ? { chunkSize: config.chunkSize } : {}),
    operations,
  });
}
