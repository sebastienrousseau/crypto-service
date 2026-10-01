// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { executeTool } from "../src";

/** A tool result as the tests read it. */
export interface ToolResult {
  isError?: boolean;
  content: Array<{ text: string }>;
}

/** Parse the JSON payload of a successful tool result. */
export const parse = (res: ToolResult) => JSON.parse(res.content[0].text);

/** Call a tool and return its parsed payload, failing on an error. */
export async function call(tool: string, args: object) {
  const res = await executeTool(tool, args as Record<string, unknown>);
  expect(res.isError, `${tool}: ${res.content[0].text}`).to.be.undefined;
  return parse(res);
}

/** Generate a key and return its public description. */
export async function newKey(type: string, extra: object = {}) {
  return call("crypto_generate_key", { type, ...extra });
}

/** Call a tool that must fail and return its error text. */
export async function callError(tool: string, args: unknown): Promise<string> {
  const res = await executeTool(tool, args as Record<string, unknown>);
  expect(res.isError, `${tool} should fail`).to.be.true;
  return res.content[0].text;
}
