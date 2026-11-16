/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Building blocks for route `response` schemas.
 *
 * Fastify serialises a response with its route's schema and drops every
 * property the schema does not name, so these schemas are the public
 * contract: `__tests__/response-contract.test.ts` checks that each one
 * keeps every field a handler sends. String fields name their encoding
 * (`contentEncoding`, `pattern` and the description) so SDKs can pick the
 * right codec: keys, signatures and digests are lowercase hex, AEAD and
 * stream ciphertexts base64, plaintexts UTF-8 text.
 */

import type { FastifyInstance } from "fastify";
import { KEY_ID_PATTERN } from "../lib/key-store";
import { PROBLEM_CONTENT_TYPE, PROBLEM_SCHEMA } from "../lib/problem";

/** Lowercase hex, two digits per byte. */
export const HEX_PATTERN = "^([0-9a-f]{2})*$";

/** Standard base64 (RFC 4648 section 4) with padding. */
export const BASE64_PATTERN = "^[A-Za-z0-9+/]*={0,2}$";

/** A string of bytes as lowercase hex. */
export const hex = (description: string) => ({
  type: "string" as const,
  pattern: HEX_PATTERN,
  contentEncoding: "base16",
  description: `${description} Lowercase hex.`,
});

/** A string of bytes as standard, padded base64. */
export const base64 = (description: string) => ({
  type: "string" as const,
  pattern: BASE64_PATTERN,
  contentEncoding: "base64",
  description: `${description} Standard base64 (RFC 4648 section 4), padded.`,
});

/** UTF-8 text. */
export const text = (description: string) => ({
  type: "string" as const,
  description: `${description} UTF-8 text.`,
});

/** Decrypted bytes, as the decryption routes return them. */
export const PLAINTEXT = text(
  "The decrypted bytes, decoded as UTF-8 (invalid sequences become U+FFFD).",
);

/** A string that is always `value`. */
export const literal = (value: string, description: string) => ({
  type: "string" as const,
  enum: [value],
  description,
});

/** A boolean field. */
export const flag = (description: string) => ({
  type: "boolean" as const,
  description,
});

/** An integer field. */
export const integer = (description: string) => ({
  type: "integer" as const,
  description,
});

/** An object whose every property is required. */
export const fields = (
  properties: Record<string, unknown>,
  description?: string,
) => ({
  type: "object" as const,
  ...(description === undefined ? {} : { description }),
  required: Object.keys(properties),
  properties,
});

/** The success body `{ data }` most routes answer with. */
export const dataBody = (description: string, data: unknown) => ({
  type: "object" as const,
  description,
  required: ["data"],
  properties: { data },
});

/** A 200 answer `{ data }`. */
export const ok = (description: string, data: unknown) => ({
  200: dataBody(description, data),
});

/** What each problem status means, for the OpenAPI document. */
const PROBLEM_DESCRIPTIONS: Readonly<Record<number, string>> = {
  400: "The body failed its schema (validation-failed, with errors[]) or the input was rejected (invalid-input, key-algorithm-mismatch, request-error).",
  401: "Missing or invalid credentials (unauthorized).",
  403: "The principal lacks the scope the route requires (forbidden).",
  404: "No such key for this principal; another principal's key answers the same (key-not-found, kms-key-not-found).",
  409: "The resource is in a conflicting state (conflict, kms-key-disabled).",
  413: "The request body is larger than the server accepts (payload-too-large).",
  415: "The request media type is not supported; send application/json (request-error).",
  429: "A rate limit or quota was exceeded (rate-limited, key-quota-exceeded).",
  500: "An internal error (internal-error); the detail never carries the cause.",
  501: "The KMS provider does not implement the operation (not-implemented).",
  503: "The server is busy or a store is full; retry later (service-unavailable, key-store-full).",
};

/** `$id` of the shared problem schema (`components.schemas.Problem`). */
export const PROBLEM_ID = "Problem";

/**
 * Add the shared problem schema to `app` unless a parent scope already
 * has it. Route schemas reference it, so it must be added before routes
 * are registered: server.ts adds it at the root, and routes/index.ts adds
 * it when its routes are registered on their own.
 */
export function addSharedSchemas(app: FastifyInstance): void {
  if (app.getSchema(PROBLEM_ID) === undefined) {
    app.addSchema({ $id: PROBLEM_ID, ...PROBLEM_SCHEMA });
  }
}

/** An RFC 9457 problem answer for each status. */
export function problems(
  ...statuses: number[]
): Record<number, Record<string, unknown>> {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: PROBLEM_DESCRIPTIONS[status],
        content: {
          [PROBLEM_CONTENT_TYPE]: { schema: { $ref: `${PROBLEM_ID}#` } },
        },
      },
    ]),
  );
}

/** Problems any authenticated route with a JSON body can answer. */
export const BODY_ERRORS = [400, 401, 403, 413, 415, 429, 500] as const;

/** Problems any authenticated route without a body can answer. */
export const GET_ERRORS = [401, 403, 429, 500] as const;

/** Problems of an authenticated JSON route. */
export const bodyProblems = (...extra: number[]) =>
  problems(...BODY_ERRORS, ...extra);

/** Response schemas of a route that answers `{ data }` with a JSON body. */
export const dataRoute = (
  description: string,
  data: unknown,
  ...extraErrors: number[]
) => ({ ...ok(description, data), ...bodyProblems(...extraErrors) });

/** The public half of a server-held key, as key-generation routes answer. */
export const KEY_ID = {
  type: "string" as const,
  pattern: KEY_ID_PATTERN,
  description:
    "Identifier of the server-held key; use it with the signing, decryption and decapsulation routes.",
};

/** The `algorithm` field of a server-held key. */
export const KEY_ALGORITHM = {
  type: "string" as const,
  description:
    "Algorithm of the key, e.g. ed25519, x25519, ml-kem-768, x25519-ml-kem-768, ml-dsa-65, slh-dsa-sha2-128f.",
};

/** `{ keyId, algorithm, publicKey }` for a single-key algorithm. */
export const publicKeyView = (algorithm: unknown, publicKey: unknown) =>
  fields({ keyId: KEY_ID, algorithm, publicKey });
