/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Column codec shared by the transformer, decorator and subscriber.
 *
 * Stored format (`v2`):
 *
 *   "v2:" || base64(nonce (24 B) || ciphertext || Poly1305 tag (16 B))
 *
 * sealed with XChaCha20-Poly1305 under a subkey derived from the
 * configured key with HKDF-SHA-256 (info `crypto-typeorm/enc/v2`), and
 * with associated data `crypto-typeorm/v2:<context>`, where the context
 * is `Entity.property`. A value moved to another column fails to decrypt.
 *
 * Legacy format (written before `v2`): the bare base64 sealed box under
 * the configured key, with no associated data. It is still read (unless
 * `acceptLegacyCiphertext` is `false`) and never written.
 */

import { secretbox, kdfDerive } from "@sebastienrousseau/crypto-lib";
import { FieldDecryptionError } from "./errors";
import type { EncryptionConfig } from "./types";

/** Prefix that marks the current ciphertext format. */
export const CIPHERTEXT_PREFIX = "v2:";

/** A 256-bit key written as 64 hexadecimal characters. */
const HEX_KEY_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Keys and read options resolved once from an {@link EncryptionConfig}.
 *
 * @example
 * ```ts
 * const codec = createColumnCodec({ key: process.env.KEY! });
 * const sealed = sealColumn(codec, "User.ssn", "123-45-6789");
 * ```
 */
export interface ColumnCodec {
  /** Configured key, used only to read legacy ciphertexts. */
  readonly legacyKey: string;
  /** HKDF subkey used to seal and open `v2` values. */
  readonly encKey: string;
  /** Whether non-ciphertext values are returned as-is on read. */
  readonly allowPlaintextFallback: boolean;
  /** Whether legacy (pre-`v2`) ciphertexts are accepted on read. */
  readonly acceptLegacyCiphertext: boolean;
}

/**
 * Validate the key and derive the encryption subkey.
 *
 * @throws If the key is not a 64-character hex string.
 *
 * @example
 * ```ts
 * const codec = createColumnCodec({ key: process.env.KEY! });
 * ```
 */
export function createColumnCodec(
  config: EncryptionConfig,
  owner = "EncryptionTransformer",
): ColumnCodec {
  if (!HEX_KEY_RE.test(config.key)) {
    throw new Error(
      `${owner}: key must be a 64-character hex string (256 bits)`,
    );
  }
  return {
    legacyKey: config.key,
    encKey: kdfDerive({
      algorithm: "hkdf-sha256",
      password: Buffer.from(config.key, "hex"),
      salt: new Uint8Array(32),
      params: { info: "crypto-typeorm/enc/v2" },
    }).derivedKey,
    allowPlaintextFallback: config.allowPlaintextFallback === true,
    acceptLegacyCiphertext: config.acceptLegacyCiphertext !== false,
  };
}

/** Associated data that binds a ciphertext to its column context. */
function contextAad(context: string): Uint8Array {
  return Buffer.from(`crypto-typeorm/v2:${context}`, "utf8");
}

/**
 * Seal a plaintext for the given column context in the `v2` format.
 *
 * @example
 * ```ts
 * const sealed = sealColumn(codec, "User.ssn", "123-45-6789");
 * ```
 */
export function sealColumn(
  codec: ColumnCodec,
  context: string,
  plaintext: string,
): string {
  const { sealed } = secretbox.seal(
    codec.encKey,
    plaintext,
    contextAad(context),
  );
  return CIPHERTEXT_PREFIX + sealed;
}

/** Open a sealed box, returning `undefined` instead of throwing. */
function tryOpen(
  key: string,
  sealed: string,
  aad?: Uint8Array,
): string | undefined {
  try {
    return Buffer.from(secretbox.open(key, sealed, aad)).toString("utf8");
  } catch {
    return undefined;
  }
}

/**
 * Decrypt a stored value for the given column context, failing closed.
 *
 * @throws `FieldDecryptionError` when the value is not a valid
 *   ciphertext for this context and no opt-in fallback applies.
 *
 * @example
 * ```ts
 * const plaintext = openColumn(codec, "User.ssn", row.ssn);
 * ```
 */
export function openColumn(
  codec: ColumnCodec,
  context: string,
  stored: string,
): string {
  if (stored.startsWith(CIPHERTEXT_PREFIX)) {
    const body = stored.slice(CIPHERTEXT_PREFIX.length);
    const plain = tryOpen(codec.encKey, body, contextAad(context));
    if (plain === undefined) throw new FieldDecryptionError(context);
    return plain;
  }
  const legacy = codec.acceptLegacyCiphertext
    ? tryOpen(codec.legacyKey, stored)
    : undefined;
  if (legacy !== undefined) return legacy;
  if (codec.allowPlaintextFallback) return stored;
  throw new FieldDecryptionError(context);
}
