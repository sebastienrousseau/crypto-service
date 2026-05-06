/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Express middleware adapter.
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
  verifyHmacSignature,
  verifyJwt,
  matchRoute,
} from "./common";

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
      // --- Verify JWT ---
      if (operations.includes("verify-jwt")) {
        if (!config.jwtSecret) {
          throw new CryptoMiddlewareError(
            "jwtSecret is required for verify-jwt operation",
            500,
            "MISSING_CONFIG",
          );
        }
        const authHeader = req.headers.authorization ?? "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : "";
        const payload = verifyJwt(config.jwtSecret, token);
        // Attach decoded JWT payload to the request
        (req as unknown as Record<string, unknown>).jwtPayload = payload;
      }

      // --- Verify HMAC signature ---
      if (operations.includes("verify-signature")) {
        if (!config.hmacKey) {
          throw new CryptoMiddlewareError(
            "hmacKey is required for verify-signature operation",
            500,
            "MISSING_CONFIG",
          );
        }
        const signature =
          (req.headers["x-signature"] as string) ??
          (req.headers["x-hub-signature-256"] as string) ??
          "";
        const rawBody =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        verifyHmacSignature(config.hmacKey, rawBody, signature);
      }

      // --- Decrypt request body ---
      if (operations.includes("decrypt-request")) {
        if (!config.key) {
          throw new CryptoMiddlewareError(
            "key is required for decrypt-request operation",
            500,
            "MISSING_CONFIG",
          );
        }
        if (
          req.body &&
          typeof req.body === "object" &&
          "encrypted" in req.body
        ) {
          req.body = decryptPayload(config.key, req.body.encrypted as string);
        }
      }

      // --- Encrypt response body ---
      if (operations.includes("encrypt-response")) {
        if (!config.key) {
          throw new CryptoMiddlewareError(
            "key is required for encrypt-response operation",
            500,
            "MISSING_CONFIG",
          );
        }
        const originalJson = res.json.bind(res);
        res.json = function encryptedJson(body: unknown): Response {
          const sealed = encryptPayload(config.key!, body);
          return originalJson({ encrypted: sealed });
        };
      }

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
