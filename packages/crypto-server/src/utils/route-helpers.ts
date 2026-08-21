/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Shared route helpers — auth guard + validation result unwrapping.
 *
 * Every route handler previously duplicated the same API-key check,
 * error-array accumulation, and `as { valid: true; value: T }` casts.
 * This module extracts those patterns into reusable utilities.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import {
  validateApiKey,
  sendValidationError,
  ValidationError,
  ValidationResult,
} from "./validation";

/**
 * Returns true (and sends a 401 reply) if the API key is invalid.
 * Callers should `return` immediately when this returns true.
 */
export function rejectUnauthorized(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  const apiKeyConfig = process.env["CRYPTO_API_KEY"];
  if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
    reply
      .status(401)
      .send({ error: "Unauthorized: Invalid or missing API key" });
    return true;
  }
  return false;
}

/**
 * Collects validation results and, if all pass, returns the unwrapped
 * values keyed by field name. Returns `null` (and sends a 400 reply)
 * when any validation fails.
 */
export function collectValidation<
  T extends Record<string, ValidationResult<unknown>>,
>(
  results: T,
  reply: FastifyReply,
):
  | { [K in keyof T]: T[K] extends ValidationResult<infer V> ? V : never }
  | null {
  const errors: ValidationError[] = [];
  for (const key of Object.keys(results)) {
    const r = results[key];
    if (!r.valid) errors.push(r.error);
  }
  if (errors.length > 0) {
    sendValidationError(reply, errors);
    return null;
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(results)) {
    const r = results[key];
    if (r.valid) out[key] = r.value;
  }
  return out as {
    [K in keyof T]: T[K] extends ValidationResult<infer V> ? V : never;
  };
}

/**
 * Classify a crypto operation error as client (4xx) or server (5xx).
 * Input validation errors (invalid hex, wrong key length, etc.) return 400.
 * @example
 * ```ts
 * classifyCryptoError(error, request, reply, "Encryption");
 * ```
 */
export function classifyCryptoError(
  error: unknown,
  request: { log: { error: (err: unknown, msg: string) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  operation: string,
): unknown {
  const msg = error instanceof Error ? error.message : String(error);
  const isInputError =
    /invalid hex/i.test(msg) ||
    /must be \d+ bytes/i.test(msg) ||
    /too short/i.test(msg) ||
    /unsupported/i.test(msg) ||
    /expected.*length/i.test(msg) ||
    /of length \d+ expected/i.test(msg);

  if (isInputError) {
    request.log.error(error, `${operation} input error`);
    return reply
      .status(400)
      .send({ error: `${operation} failed: invalid input` });
  }
  request.log.error(error, `${operation} failed`);
  return reply.status(500).send({ error: `${operation} failed` });
}
