/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The OpenAPI 3.1 document the server publishes at `/docs/json`
 * and `scripts/export-openapi.mjs` commits as
 * `openapi/crypto-service.openapi.yaml`.
 *
 * Security requirements are derived from the route policy
 * (`ROUTE_SCOPES` in `auth-policy.ts`), the same table the server
 * enforces, so the document cannot claim a scope the server does not
 * check. Each operation also gets a stable `operationId` for SDK
 * generators.
 */

import { AUTHENTICATED, isPublicRoute, routeRequirement } from "./auth-policy";
import type { FastifySchema } from "fastify";
import type { SwaggerTransformObject } from "@fastify/swagger";
import { EXPLICIT_SCOPES, type Scope } from "../lib/auth";
import { HEX_PATTERN } from "../utils/response-schemas";

/** The two credentials the server accepts (lib/auth.ts). */
export const SECURITY_SCHEMES = {
  apiKey: {
    type: "apiKey",
    name: "x-api-key",
    in: "header",
    description:
      "The static key in CRYPTO_API_KEY. It holds crypto:admin, which grants every scope except crypto:keys:export.",
  },
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "An HS256 JWT signed with JWT_SECRET. Claims: sub (required; not api-key or anonymous), iat and exp (required; lifetime at most JWT_MAX_AGE seconds, default 3600), iss and aud (when JWT_ISSUER and JWT_AUDIENCE are set, as production requires), scopes (array of scope strings). Tried first when the Authorization header carries a Bearer token.",
  },
} as const;

/** A security requirement: one scheme with its required roles. */
export type Requirement = Record<string, string[]>;

/** Either credential, no particular scope. */
const ANY_CREDENTIAL: Requirement[] = [{ apiKey: [] }, { bearerAuth: [] }];

/** The OpenAPI document's fixed parts; paths come from the routes. */
export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "Crypto Service Suite API",
    description:
      "REST API for low-level cryptographic operations: key generation, encryption, decryption, signing, verification, and revocation. Every error is an RFC 9457 problem (application/problem+json) whose type is urn:crypto-service:problem:<slug>. Each operation lists the scope it requires in x-required-scopes; with ALLOW_ANONYMOUS=1 and no credential configured, the server accepts requests without credentials.",
    license: { name: "Apache-2.0 OR MIT", identifier: "Apache-2.0 OR MIT" },
  },
  components: { securitySchemes: SECURITY_SCHEMES },
  security: ANY_CREDENTIAL,
};

/** What a route's policy adds to its operation. */
export interface OperationSecurity {
  /** OpenAPI security requirements; empty for a public route. */
  security: Requirement[];
  /** Scopes the principal must hold; absent for a public route. */
  "x-required-scopes"?: string[];
}

/**
 * The security of the route `method url`, from the route policy. A public
 * route (probes, docs, OPAQUE login) needs no credential; a scoped one
 * takes either credential, except a scope `crypto:admin` does not imply
 * (`crypto:keys:export`), which only a token can carry. The server
 * refuses to boot when a non-public route has no policy entry, so every
 * documented route has one.
 */
export function operationSecurity(
  method: string,
  url: string,
): OperationSecurity {
  if (isPublicRoute(url)) return { security: [] };
  const required = routeRequirement(method, url) as string;
  if (required === AUTHENTICATED) {
    return { security: ANY_CREDENTIAL, "x-required-scopes": [] };
  }
  const bearer = { bearerAuth: [required] };
  const explicit = EXPLICIT_SCOPES.includes(required as Scope);
  return {
    security: explicit ? [bearer] : [{ apiKey: [] }, bearer],
    "x-required-scopes": [required],
  };
}

/**
 * A stable operationId from the method and path: `POST
 * /v2/pq/slh-dsa/keygen` is `postV2PqSlhDsaKeygen`, `GET /` is `getRoot`.
 */
export function operationId(method: string, url: string): string {
  const words = url.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const pascal = words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");
  return `${method.toLowerCase()}${pascal || "Root"}`;
}

/** `contentEncoding` of a schema, from the marks the conversion keeps. */
function encodingOf(schema: Record<string, unknown>): string | undefined {
  if (schema["pattern"] === HEX_PATTERN) return "base16";
  if (schema["format"] === "byte") return "base64";
  return undefined;
}

/**
 * Put `contentEncoding` back on every hex and base64 string schema.
 * @fastify/swagger drops the keyword while converting route schemas
 * (base64 becomes `format: byte`), but OpenAPI 3.1 is JSON Schema
 * 2020-12, where `contentEncoding` is how a generator learns a string's
 * codec. Returns a copy.
 */
export function withEncodings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withEncodings);
  if (value === null || typeof value !== "object") return value;
  const copy: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, withEncodings(v)]),
  );
  const encoding = encodingOf(copy);
  return encoding === undefined ? copy : { ...copy, contentEncoding: encoding };
}

/** @fastify/swagger `transformObject`: the document with its encodings. */
export const documentObject: SwaggerTransformObject = (document) =>
  withEncodings(
    (document as { openapiObject: object }).openapiObject,
  ) as ReturnType<SwaggerTransformObject>;

/** The route, as @fastify/swagger hands it to `transform`. */
export interface DocumentedRoute {
  schema?: FastifySchema;
  url: string;
  route: { method: string | string[] };
}

/**
 * @fastify/swagger `transform`: adds the operationId and security of each
 * route to the document. It returns a copy; the schema Fastify validates
 * and serialises with is left as it is.
 */
export function documentRoute({ schema, url, route }: DocumentedRoute): {
  schema: FastifySchema;
  url: string;
} {
  const method = ([] as string[]).concat(route.method)[0]!;
  return {
    url,
    schema: {
      ...schema,
      operationId: operationId(method, url),
      ...operationSecurity(method, url),
    },
  };
}
