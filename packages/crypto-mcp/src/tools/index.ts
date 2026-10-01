// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPCallToolResult, MCPToolInputSchema } from "../types";
import { auditCbom } from "./cbom";
import { TOOLS } from "./definitions";
import { kemDecapsulate, kemEncapsulate } from "./kem";
import { destroyKey, generateKey, inspectKey, listKeys } from "./keys";
import { kmsUnwrap, kmsWrap } from "./kms";
import { ToolHandler, errorResult } from "./result";
import { hash, sign, verify } from "./signing";
import { decrypt, encrypt } from "./symmetric";
import { validateArguments } from "./validate";

export { TOOLS } from "./definitions";
export { validateArguments } from "./validate";

/** One handler per tool name declared in {@link TOOLS}. */
const HANDLERS: Record<string, ToolHandler> = {
  crypto_generate_key: generateKey,
  crypto_key_list: listKeys,
  crypto_key_destroy: destroyKey,
  crypto_kem_encapsulate: kemEncapsulate,
  crypto_kem_decapsulate: kemDecapsulate,
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

interface RegisteredTool {
  schema: MCPToolInputSchema;
  handler: ToolHandler;
}

/** Every declared tool, with its input schema and its handler. */
const REGISTRY = new Map<string, RegisteredTool>(
  TOOLS.map((tool) => [
    tool.name,
    { schema: tool.inputSchema, handler: HANDLERS[tool.name] },
  ]),
);

/**
 * Executes a tool by name. The arguments are checked against the tool's
 * declared `inputSchema` first: a handler never sees arguments that fail
 * it (unknown properties, wrong types, values outside an enum, lengths or
 * formats outside the declared bounds).
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<MCPCallToolResult> {
  const tool = REGISTRY.get(name);
  if (!tool) return errorResult(`Unknown tool name: ${name}`);
  const problem = validateArguments(tool.schema, args);
  if (problem) return errorResult(`Invalid arguments for ${name}: ${problem}`);
  try {
    return await tool.handler(args);
  } catch (err: unknown) {
    return errorResult(`Tool error (${name}): ${(err as Error).message}`);
  }
}
