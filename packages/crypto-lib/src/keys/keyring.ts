/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file In-memory keyring for key storage, lookup, and rotation.
 *
 * Provides an in-memory key store with:
 * - Key lookup by ID, algorithm, or purpose
 * - Key rotation (archive old, generate new)
 * - JWKS (JSON Web Key Set) export
 * - Encrypted-at-rest serialization via secretbox
 */

import { generateKeyPair, type KeyAlgorithm, type KeyMetadata } from "./keygen";
import { ed25519ToJwk, x25519ToJwk, type Jwk } from "./serialize";
import * as secretbox from "../high-level/secretbox";

// --- Types ---

/** A single key stored in the keyring. */
export interface KeyEntry {
  /** Unique key ID. */
  kid: string;
  /** Algorithm. */
  algorithm: KeyAlgorithm;
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
  /** Key usage. */
  use?: "sig" | "enc" | undefined;
  /** ISO 8601 expiration date. */
  exp?: string | undefined;
  /** ISO 8601 creation date. */
  createdAt: string;
  /** Whether this key has been rotated out. */
  archived: boolean;
}

/** JSON Web Key Set (JWKS) per RFC 7517 Section 5. */
export interface Jwks {
  /** Array of JWK objects in the set. */
  keys: Jwk[];
}

// --- Keyring ---

/** In-memory keyring for storing, looking up, rotating, and exporting keys. */
export class Keyring {
  private keys: Map<string, KeyEntry> = new Map();

  /** Number of keys in the keyring (including archived). */
  get size(): number {
    return this.keys.size;
  }

  /**
   * Generate a new key pair and add it to the keyring.
   */
  add(algorithm: KeyAlgorithm, metadata: KeyMetadata = {}): KeyEntry {
    const kp = generateKeyPair(algorithm, metadata);
    const entry: KeyEntry = {
      kid: kp.kid,
      algorithm: kp.algorithm,
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      use: metadata.use,
      exp: metadata.exp,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    this.keys.set(entry.kid, entry);
    return entry;
  }

  /**
   * Import an existing key entry into the keyring.
   */
  import(entry: KeyEntry): void {
    this.keys.set(entry.kid, entry);
  }

  /**
   * Get a key by its ID.
   */
  get(kid: string): KeyEntry | undefined {
    return this.keys.get(kid);
  }

  /**
   * Delete a key from the keyring.
   */
  delete(kid: string): boolean {
    return this.keys.delete(kid);
  }

  /**
   * List all keys matching the optional filters.
   */
  list(filters?: {
    algorithm?: KeyAlgorithm;
    use?: "sig" | "enc";
    includeArchived?: boolean;
  }): KeyEntry[] {
    let entries = Array.from(this.keys.values());

    if (!filters?.includeArchived) {
      entries = entries.filter((e) => !e.archived);
    }
    if (filters?.algorithm) {
      entries = entries.filter((e) => e.algorithm === filters.algorithm);
    }
    if (filters?.use) {
      entries = entries.filter((e) => e.use === filters.use);
    }

    return entries;
  }

  /**
   * Rotate a key: archive the current one and generate a new key
   * with the same algorithm and metadata.
   *
   * @returns The new key entry.
   */
  rotate(kid: string): KeyEntry {
    const old = this.keys.get(kid);
    if (!old) throw new Error(`Key not found: ${kid}`);

    old.archived = true;

    return this.add(old.algorithm, {
      use: old.use,
      exp: old.exp,
    });
  }

  /**
   * Export public keys as a JWKS (JSON Web Key Set).
   * Only supports Ed25519 and X25519 keys.
   */
  toJwks(): Jwks {
    const jwks: Jwk[] = [];

    for (const entry of this.keys.values()) {
      if (entry.archived) continue;

      let jwk: Jwk | null = null;
      if (entry.algorithm === "ed25519") {
        jwk = ed25519ToJwk(entry.publicKey);
      } else if (entry.algorithm === "x25519") {
        jwk = x25519ToJwk(entry.publicKey);
      }

      if (jwk) {
        jwk.kid = entry.kid;
        if (entry.use) jwk.use = entry.use;
        jwks.push(jwk);
      }
    }

    return { keys: jwks };
  }

  /**
   * Serialize the keyring to a JSON string.
   * WARNING: contains private keys. Use `toEncrypted()` for secure storage.
   */
  serialize(): string {
    return JSON.stringify(Array.from(this.keys.entries()));
  }

  /**
   * Deserialize a keyring from a JSON string produced by `serialize()`.
   */
  static deserialize(json: string): Keyring {
    const ring = new Keyring();
    const entries: [string, KeyEntry][] = JSON.parse(json);
    for (const [kid, entry] of entries) {
      ring.keys.set(kid, entry);
    }
    return ring;
  }

  /**
   * Encrypt the keyring with a password using secretbox.
   *
   * @param key - 256-bit key (hex or bytes).
   */
  toEncrypted(key: string | Uint8Array): string {
    const json = this.serialize();
    const result = secretbox.seal(key, json);
    return result.sealed;
  }

  /**
   * Decrypt and restore a keyring from an encrypted blob.
   *
   * @param key       - 256-bit key (hex or bytes).
   * @param encrypted - Base64-encoded encrypted keyring.
   */
  static fromEncrypted(key: string | Uint8Array, encrypted: string): Keyring {
    const decrypted = secretbox.open(key, encrypted);
    const json = Buffer.from(decrypted).toString("utf8");
    return Keyring.deserialize(json);
  }
}
