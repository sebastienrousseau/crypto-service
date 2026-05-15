/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Key rotation utility — versioned key management for gradual rollover.
 *
 * Supports rotating symmetric keys with a grace period where both old
 * and new keys are accepted for decryption, but only the current key
 * is used for encryption.
 *
 * @example
 * ```ts
 * import { createKeyRing, rotateKey, encryptWithVersion, decryptWithVersion } from "./tokens/key-rotation";
 *
 * let ring = createKeyRing({ version: "v1", key: "aa".repeat(32), activatedAt: new Date() });
 * const { ciphertext, version } = encryptWithVersion(ring, "secret data");
 *
 * ring = rotateKey(ring, { version: "v2", key: "bb".repeat(32), activatedAt: new Date() });
 * // Old ciphertext still decryptable with previous key
 * const plaintext = decryptWithVersion(ring, ciphertext, version);
 * ```
 */

import * as secretbox from "../high-level/secretbox";

// --- Types ---

/** A versioned key with activation and optional expiry metadata. */
export interface VersionedKey {
  /** Unique key version identifier (e.g., "v1", "2024-01-01"). */
  version: string;
  /** Hex-encoded key material. */
  key: string;
  /** When this key was activated. */
  activatedAt: Date;
  /** When this key should stop being used for encryption. */
  expiresAt?: Date;
}

/**
 * A key ring holding the current encryption key and previous keys
 * still accepted for decryption.
 */
export interface KeyRing {
  /** The current active key (used for encryption). */
  current: VersionedKey;
  /** Previous keys still accepted for decryption. */
  previous: VersionedKey[];
}

/**
 * Create a new key ring with a single active key.
 *
 * @example
 * ```ts
 * const ring = createKeyRing({ version: "v1", key: "aa".repeat(32), activatedAt: new Date() });
 * ```
 *
 * @param current - The initial active key.
 * @returns A new key ring.
 */
export function createKeyRing(current: VersionedKey): KeyRing {
  return { current, previous: [] };
}

/**
 * Rotate the key ring — the current key moves to `previous` and
 * `newKey` becomes the current encryption key.
 *
 * @example
 * ```ts
 * ring = rotateKey(ring, { version: "v2", key: "bb".repeat(32), activatedAt: new Date() });
 * ```
 *
 * @param ring   - The existing key ring.
 * @param newKey - The new key to activate.
 * @returns A new key ring with the rotated keys.
 */
export function rotateKey(ring: KeyRing, newKey: VersionedKey): KeyRing {
  return {
    current: newKey,
    previous: [...ring.previous, ring.current],
  };
}

/**
 * Find a key by its version identifier (checks current and previous).
 *
 * @example
 * ```ts
 * const key = findKeyByVersion(ring, "v1");
 * ```
 *
 * @param ring    - The key ring to search.
 * @param version - The version identifier to look up.
 * @returns The matching key, or `undefined` if not found.
 */
export function findKeyByVersion(
  ring: KeyRing,
  version: string,
): VersionedKey | undefined {
  if (ring.current.version === version) return ring.current;
  return ring.previous.find((k) => k.version === version);
}

/**
 * Remove expired keys from the `previous` list.
 *
 * Keys whose `expiresAt` is before `now` are pruned. The current key
 * is never pruned regardless of its expiry.
 *
 * @example
 * ```ts
 * ring = pruneExpiredKeys(ring);
 * ```
 *
 * @param ring - The key ring to prune.
 * @param now  - Reference time (defaults to `new Date()`).
 * @returns A new key ring with expired keys removed.
 */
export function pruneExpiredKeys(ring: KeyRing, now?: Date): KeyRing {
  const ref = now ?? new Date();
  return {
    current: ring.current,
    previous: ring.previous.filter((k) => !k.expiresAt || k.expiresAt > ref),
  };
}

/**
 * Encrypt plaintext using the current key, returning the ciphertext
 * and the key version used.
 *
 * @example
 * ```ts
 * const { ciphertext, version } = encryptWithVersion(ring, "secret");
 * ```
 *
 * @param ring      - The key ring (current key is used).
 * @param plaintext - The data to encrypt.
 * @returns Ciphertext (base64) and version identifier.
 */
export function encryptWithVersion(
  ring: KeyRing,
  plaintext: string,
): {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Key version used for encryption. */
  version: string;
} {
  const { sealed } = secretbox.seal(ring.current.key, plaintext);
  return { ciphertext: sealed, version: ring.current.version };
}

/**
 * Decrypt ciphertext by looking up the key version in the ring.
 *
 * @example
 * ```ts
 * const plaintext = decryptWithVersion(ring, ciphertext, "v1");
 * ```
 *
 * @param ring       - The key ring to search for the decryption key.
 * @param ciphertext - Base64-encoded ciphertext from {@link encryptWithVersion}.
 * @param version    - The key version that was used to encrypt.
 * @returns The decrypted plaintext string.
 * @throws If the version is not found in the ring.
 */
export function decryptWithVersion(
  ring: KeyRing,
  ciphertext: string,
  version: string,
): string {
  const vk = findKeyByVersion(ring, version);
  if (!vk) {
    throw new Error(`Key version "${version}" not found in key ring`);
  }
  const pt = secretbox.open(vk.key, ciphertext);
  return Buffer.from(pt).toString("utf8");
}
