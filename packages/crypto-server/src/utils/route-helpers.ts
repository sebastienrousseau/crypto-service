/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Shared route helpers — validation result unwrapping and error
 * classification.
 *
 * Authentication is not done here: a server-wide `onRequest` hook
 * (server.ts) authenticates every non-public request before any route runs.
 */

import type { FastifyReply } from "fastify";
import { cryptoErrorStatus, isCryptoError, sendProblem } from "../lib/problem";
import {
  sendValidationError,
  ValidationError,
  ValidationResult,
} from "./validation";

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

/** Error messages from crypto-lib and @noble/* that mean bad input. */
const INPUT_ERROR_PATTERNS: readonly RegExp[] = [
  /invalid hex/i,
  /must be \d+ bytes/i,
  /too short/i,
  /unsupported/i,
  /expected.*length/i,
  /of length \d+ expected/i,
];

/**
 * Classify a crypto operation error as client (4xx) or server (5xx), and
 * send it as an RFC 9457 problem. A crypto-lib `CryptoError` is
 * classified by its `code`, which the problem carries as `code`.
 * Input validation errors (invalid hex, wrong key length, etc.) return 400.
 * @example
 * ```ts
 * classifyCryptoError(error, request, reply, "Encryption");
 * ```
 */
export function classifyCryptoError(
  error: unknown,
  request: { log: { error: (err: unknown, msg: string) => void } },
  reply: FastifyReply,
  operation: string,
): FastifyReply {
  const msg = error instanceof Error ? error.message : String(error);
  // A crypto-lib CryptoError carries a code; anything else is classified
  // by its message.
  const code = isCryptoError(error) ? error.code : undefined;
  const isInputError =
    code === undefined
      ? INPUT_ERROR_PATTERNS.some((pattern) => pattern.test(msg))
      : cryptoErrorStatus(code) === 400;
  const extensions = code === undefined ? {} : { code };

  if (isInputError) {
    request.log.error(error, `${operation} input error`);
    return sendProblem(
      reply,
      400,
      "invalid-input",
      `${operation} failed: invalid input`,
      extensions,
    );
  }
  request.log.error(error, `${operation} failed`);
  return sendProblem(
    reply,
    500,
    "internal-error",
    `${operation} failed`,
    extensions,
  );
}
