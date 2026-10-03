/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks RFC 9457 problem details for every error the server returns.
 *
 * Each error response is `application/problem+json`:
 * `{ type, title, status, detail, instance }`, plus extension members
 * where they help a client (`code` for crypto-lib and key-store errors,
 * `errors` for validation failures, quota fields for metering).
 *
 * `type` is a URN, `urn:crypto-service:problem:<slug>`: stable and
 * machine-readable, without claiming a documentation page exists.
 * `instance` is the request path (the query string is left out, as it can
 * carry data the client did not mean to have echoed).
 */

import { STATUS_CODES } from "http";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CryptoError } from "@sebastienrousseau/crypto-lib";
import { KeyStoreError } from "./key-store";

/** Media type of every error response. */
export const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** Prefix of every problem `type`. */
export const PROBLEM_TYPE_PREFIX = "urn:crypto-service:problem:";

/** Problem types and their titles, keyed by slug. */
export const PROBLEM_TITLES = Object.freeze({
  "validation-failed": "Validation failed",
  "invalid-input": "Invalid input",
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  "not-found": "Not Found",
  "key-not-found": "Key not found",
  "key-algorithm-mismatch": "Key algorithm mismatch",
  "key-store-full": "Key store full",
  "payload-too-large": "Payload Too Large",
  "rate-limited": "Too Many Requests",
  "request-error": "Bad Request",
  "internal-error": "Internal Server Error",
});

/** A problem type slug. */
export type ProblemSlug = keyof typeof PROBLEM_TITLES;

/** An RFC 9457 problem details object. */
export interface Problem {
  /** `urn:crypto-service:problem:<slug>`. */
  type: string;
  /** Short summary of the problem type. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Explanation of this occurrence, safe to show the client. */
  detail: string;
  /** Request path of this occurrence. */
  instance?: string;
  /** Extension members. */
  [extension: string]: unknown;
}

/** JSON Schema of a problem body, for route `response` schemas. */
export const PROBLEM_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
    instance: { type: "string" },
    code: { type: "string" },
    errors: { type: "array" },
  },
} as const;

/** Build a problem body. `title` defaults to the slug's title. */
export function problem(
  status: number,
  slug: ProblemSlug,
  detail: string,
  extensions: Record<string, unknown> = {},
  instance?: string,
): Problem {
  return {
    type: `${PROBLEM_TYPE_PREFIX}${slug}`,
    title: PROBLEM_TITLES[slug],
    status,
    detail,
    ...(instance === undefined ? {} : { instance }),
    ...extensions,
  };
}

/** The path of a request, without its query string. */
const pathOf = (request: FastifyRequest | undefined): string | undefined =>
  request?.url.split("?")[0];

/** Send a problem with the problem+json media type. */
export function sendProblem(
  reply: FastifyReply,
  status: number,
  slug: ProblemSlug,
  detail: string,
  extensions?: Record<string, unknown>,
): FastifyReply {
  const body = problem(status, slug, detail, extensions, pathOf(reply.request));
  return reply.status(status).type(PROBLEM_CONTENT_TYPE).send(body);
}

/** crypto-lib error codes that describe bad input (400); others are 500. */
const CRYPTO_INPUT_CODES: ReadonlySet<string> = new Set([
  "INVALID_KEY",
  "UNSUPPORTED_ALGORITHM",
  "INVALID_HEX",
  "INVALID_CIPHERTEXT",
  "AUTH_FAILED",
  "INVALID_INPUT",
]);

/** HTTP status for a crypto-lib error code. */
export function cryptoErrorStatus(code: string): number {
  return CRYPTO_INPUT_CODES.has(code) ? 400 : 500;
}

/** Whether a value is a crypto-lib {@link CryptoError}. */
export function isCryptoError(error: unknown): error is CryptoError {
  return error instanceof CryptoError;
}

/** Key-store error codes, mapped to problem types. */
const KEY_STORE_SLUGS: Readonly<Record<string, ProblemSlug>> = {
  KEY_NOT_FOUND: "key-not-found",
  KEY_ALGORITHM_MISMATCH: "key-algorithm-mismatch",
  KEY_STORE_FULL: "key-store-full",
  STORAGE_KEY_REQUIRED: "internal-error",
  KEY_INTEGRITY_FAILED: "internal-error",
  KEY_CORRUPTED: "internal-error",
  UNSUPPORTED_STORAGE_ALGORITHM: "internal-error",
};

/** What the error handler sends for a thrown error. */
export interface ProblemSpec {
  /** HTTP status. */
  status: number;
  /** Problem type. */
  slug: ProblemSlug;
  /** Client-safe explanation. */
  detail: string;
  /** Extension members. */
  extensions: Record<string, unknown>;
}

/** A validation issue, as Fastify's Ajv reports it. */
interface Issue {
  instancePath: string;
  params: { missingProperty?: string };
  message?: string;
}

/** The fields of a thrown error the error handler reads. */
interface ThrownError {
  statusCode?: number;
  message?: string;
  validation?: Issue[];
}

/** The field a validation issue is about, as a JSON pointer. */
function fieldOf(issue: Issue): string {
  const missing = issue.params.missingProperty;
  return missing ? `${issue.instancePath}/${missing}` : issue.instancePath;
}

/** The fixed 500 problem: internal messages never reach the client. */
const internal = (extensions: Record<string, unknown> = {}): ProblemSpec => ({
  status: 500,
  slug: "internal-error",
  detail: "An unexpected error occurred",
  extensions,
});

/** 400 for a request body, query or params that failed its schema. */
function validationProblem(error: Required<ThrownError>): ProblemSpec {
  const errors = error.validation.map((issue) => ({
    field: fieldOf(issue),
    message: issue.message ?? "is invalid",
  }));
  return {
    status: 400,
    slug: "validation-failed",
    detail: error.message,
    extensions: { errors },
  };
}

/** A crypto-lib error: its `code` decides 400 or 500. */
function cryptoProblem(error: CryptoError): ProblemSpec {
  if (cryptoErrorStatus(error.code) === 500) {
    return internal({ code: error.code });
  }
  return {
    status: 400,
    slug: "invalid-input",
    detail: "Invalid input",
    extensions: { code: error.code },
  };
}

/** A key-store error (404, 400 or 503) with its own client-safe message. */
function keyStoreProblem(error: KeyStoreError): ProblemSpec {
  return {
    status: error.statusCode,
    slug: KEY_STORE_SLUGS[error.code] ?? "request-error",
    detail: error.message,
    extensions: { code: error.code },
  };
}

/** A 4xx thrown by Fastify or a plugin (bad JSON, body too large, 429). */
function clientProblem(status: number, error: ThrownError): ProblemSpec {
  const slug: ProblemSlug =
    status === 429
      ? "rate-limited"
      : status === 413
        ? "payload-too-large"
        : "request-error";
  return {
    status,
    slug,
    detail: error.message ?? String(STATUS_CODES[status]),
    extensions: {},
  };
}

/**
 * Map a thrown error to the problem the server sends. Anything that is
 * not a known client error becomes a 500 with a fixed detail: internal
 * messages and stacks never reach the client.
 */
export function classifyThrown(error: unknown): ProblemSpec {
  if (isCryptoError(error)) return cryptoProblem(error);
  if (error instanceof KeyStoreError) return keyStoreProblem(error);
  const thrown = (error ?? {}) as ThrownError;
  if (thrown.validation) {
    return validationProblem(thrown as Required<ThrownError>);
  }
  const status = thrown.statusCode ?? 500;
  if (status >= 400 && status < 500) return clientProblem(status, thrown);
  return internal();
}

/**
 * Install the server-wide error and not-found handlers, so every error
 * response is an RFC 9457 problem. 5xx errors are logged with the full
 * error; the client gets only the fixed detail.
 */
export function registerProblemHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const spec = classifyThrown(error);
    if (spec.status >= 500) request.log.error(error, "Request failed");
    return sendProblem(
      reply,
      spec.status,
      spec.slug,
      spec.detail,
      spec.extensions,
    );
  });
  app.setNotFoundHandler((request, reply) =>
    sendProblem(
      reply,
      404,
      "not-found",
      `Route ${request.method} ${pathOf(request)} not found`,
    ),
  );
}
