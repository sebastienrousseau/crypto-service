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
import { MiddlewareConfig, CryptoMiddlewareError } from "./types";
import {
  decryptPayload,
  encryptPayload,
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
  if (operations.includes("encrypt-response")) {
    encryptJsonResponses(config, res);
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
