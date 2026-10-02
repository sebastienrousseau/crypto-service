// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * MCP protocol helpers: revision negotiation and the JSON-RPC errors the
 * server returns for invalid requests.
 */

import type { JSONRPCRequest } from "./types";

/** Revisions this server implements, newest first. */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;

/**
 * The revision to answer `initialize` with: the client's own when this
 * server implements it, else the newest this server implements (the
 * client then decides whether it can continue).
 */
export function negotiateProtocolVersion(requested: unknown): string {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly unknown[]).includes(requested)
    ? (requested as string)
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

/** JSON-RPC "Invalid params". */
export const INVALID_PARAMS = -32602;

/** An error carrying the JSON-RPC code the server answers with. */
export class McpError extends Error {
  public constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "McpError";
  }
}

/** True for a notification, which must never be answered. */
export const isNotification = (request: JSONRPCRequest): boolean =>
  !("id" in request) || request.id === undefined;

/**
 * The `name` parameter of a request, which must be one of `known`;
 * otherwise an Invalid params error.
 */
export function requireName(
  params: Record<string, unknown> | undefined,
  known: readonly { name: string }[],
  kind: string,
): string {
  const name = params?.name;
  if (typeof name !== "string" || name === "") {
    throw new McpError(
      INVALID_PARAMS,
      `Invalid params: ${kind} name is required`,
    );
  }
  if (!known.some((k) => k.name === name)) {
    throw new McpError(
      INVALID_PARAMS,
      `Invalid params: unknown ${kind}: ${name}`,
    );
  }
  return name;
}

/** The `arguments` parameter of a request as an object (default `{}`). */
export function requireArguments(
  params: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const args = params?.arguments ?? {};
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new McpError(
      INVALID_PARAMS,
      "Invalid params: arguments must be an object",
    );
  }
  return args as Record<string, unknown>;
}

/** Refuse a prompt call that omits a required argument. */
export function requirePromptArguments(
  declared: readonly { name: string; required?: boolean }[] | undefined,
  args: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value !== "string") {
      throw new McpError(
        INVALID_PARAMS,
        `Invalid params: argument ${key} must be a string`,
      );
    }
    out[key] = value;
  }
  for (const arg of declared ?? []) {
    if (arg.required && !out[arg.name]) {
      throw new McpError(
        INVALID_PARAMS,
        `Invalid params: missing required argument ${arg.name}`,
      );
    }
  }
  return out;
}
