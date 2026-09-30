// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPCallToolResult } from "../types";
import { auditCbom } from "./cbom";
import { generateKey, inspectKey } from "./keys";
import { kmsUnwrap, kmsWrap } from "./kms";
import { ToolHandler, errorResult } from "./result";
import { hash, sign, verify } from "./signing";
import { decrypt, encrypt } from "./symmetric";

export { TOOLS } from "./definitions";

/** One handler per tool name declared in {@link TOOLS}. */
const HANDLERS: Record<string, ToolHandler> = {
  crypto_generate_key: generateKey,
  crypto_encrypt: encrypt,
  crypto_decrypt: decrypt,
  crypto_sign: sign,
  crypto_verify: verify,
  crypto_hash: hash,
  crypto_kms_wrap: kmsWrap,
  crypto_kms_unwrap: kmsUnwrap,
  crypto_inspect_key: inspectKey,
  crypto_audit_cbom: auditCbom,
};

/**
 * Executes a tool by name with provided arguments.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<MCPCallToolResult> {
  const handler = Object.hasOwn(HANDLERS, name) ? HANDLERS[name] : undefined;
  if (!handler) return errorResult(`Unknown tool name: ${name}`);
  try {
    return await handler(args);
  } catch (err: unknown) {
    return errorResult(`Tool error (${name}): ${(err as Error).message}`);
  }
}
