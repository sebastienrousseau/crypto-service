/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Audit log of key custody and KMS operations.
 *
 * Every request that creates, exports, deletes or uses a server-held key,
 * calls a KMS provider, or registers an OPAQUE credential writes one log
 * line, `msg: "audit"`, at info level, after the response:
 *
 * ```json
 * { "audit": { "action": "POST /v2/keys/export", "principal": "alice",
 *   "status": 404, "outcome": "failure", "keyId": "k_..." } }
 * ```
 *
 * Refused and failed requests are recorded too. The line carries the
 * request's `reqId`; it never carries key material, only identifiers.
 */

import type { FastifyInstance, FastifyRequest } from "fastify";

/** Routes that create, export or delete keys, or register credentials. */
const AUDITED_ROUTES = new Set([
  "/v1/generate",
  "/v1/revoke",
  "/v2/keys/generate",
  "/v2/keys/export",
  "/v2/keys/delete",
  "/v2/pq/keygen",
  "/v2/pq/dsa/keygen",
  "/v2/pq/slh-dsa/keygen",
  "/v2/pq/hybrid/keygen",
  "/v2/hpke/keygen",
  "/v2/opaque/register/init",
  "/v2/opaque/register/finish",
]);

/** Key identifiers worth recording: server key IDs, KMS IDs and ARNs. */
const IDENTIFIER = /^[A-Za-z0-9._:/-]{1,256}$/;

/** One audit record. */
export interface AuditRecord {
  /** Method and route pattern. */
  action: string;
  /** The authenticated subject, or `unauthenticated`. */
  principal: string;
  /** Response status. */
  status: number;
  /** `success` below 400, `failure` otherwise. */
  outcome: "success" | "failure";
  /** The key the request named or created. */
  keyId?: string;
  /** The KMS provider the request named. */
  provider?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    /** The key this request created, for its audit record. */
    auditKeyId: string | undefined;
  }
}

/** Records the key a request created, for its audit record. */
export function noteAuditKey(request: FastifyRequest, keyId: string): void {
  request.auditKeyId = keyId;
}

/** The string `field` of the request body, if it is an identifier. */
function identifier(body: unknown, field: string): string | undefined {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === "string" && IDENTIFIER.test(value)
    ? value
    : undefined;
}

/** Whether a request to `route` with `body` is audited. */
function audited(route: string, body: unknown): boolean {
  return (
    AUDITED_ROUTES.has(route) ||
    route.startsWith("/v2/kms/") ||
    identifier(body, "keyId") !== undefined
  );
}

/** The audit record of a finished request. */
export function auditRecord(
  request: FastifyRequest,
  route: string,
  status: number,
): AuditRecord {
  const auth = (request as { auth?: { sub: string } }).auth;
  const keyId = request.auditKeyId ?? identifier(request.body, "keyId");
  const provider = identifier(request.body, "provider");
  return {
    action: `${request.method} ${route}`,
    principal: auth?.sub ?? "unauthenticated",
    status,
    outcome: status < 400 ? "success" : "failure",
    ...(keyId === undefined ? {} : { keyId }),
    ...(provider === undefined ? {} : { provider }),
  };
}

/** Writes an audit line after every audited response. */
export function registerAudit(app: FastifyInstance): void {
  app.decorateRequest("auditKeyId", undefined);
  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url;
    if (route === undefined || !audited(route, request.body)) return;
    request.log.info(
      { audit: auditRecord(request, route, reply.statusCode) },
      "audit",
    );
  });
}
