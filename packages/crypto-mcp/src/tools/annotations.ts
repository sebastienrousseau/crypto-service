// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Human titles and behaviour annotations (MCP 2025-03-26 and later) for
 * each tool. `readOnlyHint` is true only where a call changes no server
 * state: tools that add a key handle or a KMS key-encryption key are not
 * read-only, and only key destruction is destructive. No tool reaches
 * beyond this process, so `openWorldHint` is false throughout.
 */

import type { MCPToolAnnotations } from "../types";

type Behaviour = "read" | "add" | "destroy";

const HINTS: Record<Behaviour, Omit<MCPToolAnnotations, "title">> = {
  read: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  add: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  destroy: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
};

const TOOL_BEHAVIOUR: Record<string, [title: string, behaviour: Behaviour]> = {
  crypto_generate_key: ["Generate a key", "add"],
  crypto_key_list: ["List key handles", "read"],
  crypto_key_destroy: ["Destroy a key", "destroy"],
  crypto_key_import: ["Import a key from a file", "add"],
  crypto_inspect_key: ["Inspect a public key", "read"],
  // Without a handle, encrypt generates a key and stores it.
  crypto_encrypt: ["Encrypt data", "add"],
  crypto_decrypt: ["Decrypt data", "read"],
  crypto_kem_encapsulate: ["Encapsulate a shared secret", "add"],
  crypto_kem_decapsulate: ["Decapsulate a shared secret", "add"],
  crypto_stream_encrypt: ["Stream encrypt data (post-quantum)", "read"],
  crypto_stream_decrypt: ["Stream decrypt data (post-quantum)", "read"],
  crypto_stream_multi_encrypt: [
    "Multi-recipient stream encrypt data (post-quantum)",
    "read",
  ],
  crypto_stream_multi_decrypt: [
    "Multi-recipient stream decrypt data (post-quantum)",
    "read",
  ],
  crypto_sign: ["Sign data", "read"],
  crypto_verify: ["Verify a signature", "read"],
  crypto_hash: ["Hash data", "read"],
  // Wrapping creates the label's key-encryption key on first use.
  crypto_kms_wrap: ["Wrap a key (KMS)", "add"],
  crypto_kms_unwrap: ["Unwrap a key (KMS)", "add"],
  crypto_audit_cbom: ["Audit a CBOM", "read"],
};

/** The title and annotations for `name`, or undefined if unlisted. */
export function annotationsFor(
  name: string,
): { title: string; annotations: MCPToolAnnotations } | undefined {
  const entry = TOOL_BEHAVIOUR[name];
  if (!entry) return undefined;
  const [title, behaviour] = entry;
  return { title, annotations: { title, ...HINTS[behaviour] } };
}
