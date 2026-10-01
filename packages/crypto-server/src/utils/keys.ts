/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Route helpers for server-held keys: store a generated key pair,
 * resolve a `keyId` for the authenticated principal, and shape the public
 * view routes return.
 */

import type { FastifyRequest } from "fastify";
import { loadKeystore } from "@sebastienrousseau/crypto-lib/dist/key/keystore";
import {
  KEY_ID_PATTERN,
  type KeyParts,
  type KeyStore,
  type StoredKey,
} from "../lib/key-store";

declare module "fastify" {
  interface FastifyInstance {
    /** Server-side store of generated key pairs (see `lib/key-store.ts`). */
    keyStore: KeyStore;
  }
}

/** JSON Schema for a `keyId` request field. */
export const KEY_ID_SCHEMA = {
  type: "string",
  pattern: KEY_ID_PATTERN,
  description:
    "Identifier of a server-held key, returned by a key-generation route.",
} as const;

/**
 * The authenticated subject. The server-wide auth hook sets `request.auth`
 * on every non-public route before any handler runs.
 */
function principalOf(request: FastifyRequest): string {
  return (request as unknown as { auth: { sub: string } }).auth.sub;
}

/**
 * Resolve `keyId` for the requesting principal. Throws a 404 for an
 * unknown key or another principal's, and a 400 for a key whose
 * algorithm is not in `algorithms` (when given).
 */
export function resolveKey(
  request: FastifyRequest,
  keyId: string,
  algorithms?: readonly string[],
): Promise<StoredKey> {
  return request.server.keyStore.get(keyId, principalOf(request), algorithms);
}

/** Store a generated key pair for the requesting principal. */
export function storeKey(
  request: FastifyRequest,
  algorithm: string,
  publicParts: KeyParts,
  privateParts: KeyParts,
): Promise<StoredKey> {
  return request.server.keyStore.put({
    algorithm,
    owner: principalOf(request),
    publicParts,
    privateParts,
  });
}

/**
 * The server's own OpenPGP private key (the keystore in `CRYPTO_KEY_DIR`),
 * base64-encoded armor as crypto-lib's v1 functions take it. The v1
 * routes use it instead of a client-supplied private key.
 */
export async function serverPgpPrivateKey(): Promise<string> {
  const { privateKeyArmored } = await loadKeystore();
  return Buffer.from(privateKeyArmored, "latin1").toString("base64");
}

/** What key-generation routes return: the identifier and public parts only. */
export function publicView(key: StoredKey): Record<string, string> {
  return { keyId: key.keyId, algorithm: key.algorithm, ...key.publicParts };
}
