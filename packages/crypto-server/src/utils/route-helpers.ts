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
import {
  busy,
  cryptoErrorStatus,
  isCryptoError,
  isWorkerOverload,
  sendProblem,
} from "../lib/problem";
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

/**
 * Classify a crypto operation error as client (4xx) or server (5xx), and
 * send it as an RFC 9457 problem. A crypto-lib `CryptoError` is
 * classified by its `code` (crypto-lib's `isCallerErrorCode`), which the
 * problem carries as `code`; a RangeError from @noble/* (input of the
 * wrong length) is a 400; anything else is a 500.
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
  if (isWorkerOverload(error)) {
    const spec = busy();
    return sendProblem(reply, spec.status, spec.slug, spec.detail);
  }
  // A crypto-lib CryptoError carries a code. Anything else is classified
  // by its class, never its message: @noble/* throws RangeError for input
  // of the wrong length; any other error is a fault on this side.
  const code = isCryptoError(error) ? error.code : undefined;
  const isInputError =
    code === undefined
      ? error instanceof RangeError
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
