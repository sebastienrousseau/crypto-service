/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks W3C Trace Context (traceparent and tracestate) utilities.
 *
 * Implements W3C Trace Context Level 1 specification:
 * Format: 00-${trace_id}-${parent_id}-${trace_flags}
 * - version: 2 hex characters ("00")
 * - trace_id: 32 hex characters (16 bytes, non-zero)
 * - parent_id: 16 hex characters (8 bytes, non-zero)
 * - trace_flags: 2 hex characters (e.g. "01" recorded/sampled)
 */

import { randomBytes } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

/** Regex pattern matching the W3C traceparent Level 1 format. */
const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/** All-zero string for trace ID invalid check. */
const ALL_ZERO_TRACE_ID = "0".repeat(32);
/** All-zero string for parent ID invalid check. */
const ALL_ZERO_PARENT_ID = "0".repeat(16);

/**
 * Parsed components of a W3C traceparent header.
 */
export interface TraceparentComponents {
  version: string;
  traceId: string;
  parentId: string;
  flags: string;
}

/**
 * Validates whether a header value strictly conforms to W3C Trace Context Level 1.
 *
 * @param header - The header value to check.
 * @returns `true` if valid, `false` otherwise.
 */
export function isValidTraceparent(header: unknown): header is string {
  if (typeof header !== "string") return false;
  const match = TRACEPARENT_REGEX.exec(header.trim());
  if (!match) return false;
  const traceId = match[1];
  const parentId = match[2];
  if (traceId === ALL_ZERO_TRACE_ID || parentId === ALL_ZERO_PARENT_ID) {
    return false;
  }
  return true;
}

/**
 * Parses a W3C traceparent header into its constituent components.
 *
 * @param header - The traceparent string.
 * @returns Parsed components or `null` if invalid.
 */
export function parseTraceparent(header: string): TraceparentComponents | null {
  if (!isValidTraceparent(header)) return null;
  const match = TRACEPARENT_REGEX.exec(header.trim())!;
  return {
    version: "00",
    traceId: match[1]!,
    parentId: match[2]!,
    flags: match[3]!,
  };
}

/**
 * Generates a compliant W3C Trace Context Level 1 traceparent header.
 *
 * @param sampled - Whether to mark the trace as sampled (default true -> "01").
 * @returns Formatted traceparent string.
 */
export function generateTraceparent(sampled = true): string {
  const traceId = randomBytes(16).toString("hex");
  const parentId = randomBytes(8).toString("hex");
  const flags = sampled ? "01" : "00";
  return `00-${traceId}-${parentId}-${flags}`;
}

/**
 * Extracts or generates W3C traceparent, propagates it to the response headers,
 * and sets trace metadata on the Fastify request.
 *
 * @param request - Incoming Fastify request.
 * @param reply - Outgoing Fastify reply.
 */
export function propagateTraceContext(
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const incoming = request.headers["traceparent"];
  let traceparentValue: string;

  if (isValidTraceparent(incoming)) {
    traceparentValue = incoming.trim();
    const tracestate = request.headers["tracestate"];
    if (typeof tracestate === "string" && tracestate.trim().length > 0) {
      reply.header("tracestate", tracestate.trim());
    }
  } else {
    traceparentValue = generateTraceparent();
  }

  reply.header("traceparent", traceparentValue);
  const parsed = parseTraceparent(traceparentValue);
  if (parsed) {
    (request as unknown as { traceId?: string }).traceId = parsed.traceId;
  }
  (request as unknown as { traceparent?: string }).traceparent =
    traceparentValue;
}
