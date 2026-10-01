// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPCallToolResult } from "../types";

/** Arguments passed to a tool handler. */
export type ToolArgs = Record<string, unknown>;

/** A tool implementation: validates its arguments and returns a result. */
export type ToolHandler = (args: ToolArgs) => Promise<MCPCallToolResult>;

/** Wrap a JSON-serialisable value as a successful tool result. */
export function jsonResult(value: unknown): MCPCallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

/** Build an error tool result carrying a plain-text message. */
export function errorResult(text: string): MCPCallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}
