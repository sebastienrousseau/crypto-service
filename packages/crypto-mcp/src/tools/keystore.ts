// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";

/*
 * Key handles. Secret key material created or recovered by a tool stays
 * in this process; the caller (an LLM client) only ever sees an opaque
 * random handle plus public metadata. Tools that need a secret take the
 * handle. The store is bounded: once full, the least recently used key
 * is evicted, and raw secret bytes are overwritten with zeros when a key
 * is evicted or destroyed.
 */

/** Kinds of key the store holds. */
export type KeyKind =
  | "ed25519"
  | "rsa"
  | "ecc"
  | "x25519"
  | "ml-kem-768"
  | "symmetric-256"
  | "hmac-sha256";

/** Key material handed to {@link KeyStore.add}. */
export interface KeyMaterial {
  kind: KeyKind;
  /** Public metadata returned to the caller (public key, size, curve). */
  info: Record<string, unknown>;
  /** Asymmetric private key (Ed25519, RSA, ECC). */
  privateKey?: crypto.KeyObject;
  /** Asymmetric public key (Ed25519, RSA, ECC). */
  publicKey?: crypto.KeyObject;
  /** Raw secret bytes (symmetric, HMAC, ML-KEM secret key). */
  secret?: Buffer;
}

interface StoredKey extends KeyMaterial {
  createdAt: string;
}

/** Most keys one server process holds at a time. */
export const MAX_KEYS = 64;

/** Format of a key handle: `kh_` and 128 random bits in hex. */
export const KEY_HANDLE_PATTERN = "^kh_[0-9a-f]{32}$";

/**
 * Key material for a 256-bit symmetric key (AEAD and KMS wrapping).
 * `source` records where it came from: generated, unwrapped, or a KEM.
 */
export function symmetricKey(secret: Buffer, source: string): KeyMaterial {
  return {
    kind: "symmetric-256",
    secret,
    info: {
      bits: 256,
      source,
      usage: "crypto_encrypt, crypto_decrypt, crypto_kms_wrap",
    },
  };
}

/** Overwrite raw secret bytes. KeyObjects cannot be wiped from JS. */
function wipe(key: KeyMaterial): void {
  if (key.secret) {
    wipeMemory(key.secret);
  }
}

/** A bounded, least-recently-used store of keys addressed by handle. */
export class KeyStore {
  private readonly keys = new Map<string, StoredKey>();

  /** Most keys held before the least recently used is evicted. */
  public constructor(public readonly capacity: number = MAX_KEYS) {}

  /** Number of keys held. */
  public get size(): number {
    return this.keys.size;
  }

  /** Store key material and return its new handle. */
  public add(material: KeyMaterial): string {
    const handle = `kh_${crypto.randomBytes(16).toString("hex")}`;
    this.keys.set(handle, {
      ...material,
      createdAt: new Date().toISOString(),
    });
    while (this.keys.size > this.capacity) {
      const oldest = this.keys.keys().next().value as string;
      this.remove(oldest);
    }
    return handle;
  }

  /**
   * Look up a key for use by a tool that accepts the given kinds. Using
   * a key marks it most recently used.
   */
  public use(handle: string, kinds: readonly KeyKind[]): KeyMaterial {
    const key = this.keys.get(handle);
    if (!key) {
      throw new Error(
        "Unknown key handle: it was never issued, or the key was destroyed or evicted",
      );
    }
    if (!kinds.includes(key.kind)) {
      throw new Error(
        `Key handle refers to a ${key.kind} key; this tool needs ${kinds.join(" or ")}`,
      );
    }
    this.keys.delete(handle);
    this.keys.set(handle, key);
    return key;
  }

  /** Public description of one key: handle, type and metadata. */
  public describe(handle: string): Record<string, unknown> {
    const key = this.keys.get(handle) as StoredKey;
    return {
      keyHandle: handle,
      type: key.kind,
      createdAt: key.createdAt,
      ...key.info,
    };
  }

  /** Public descriptions of every key, least recently used first. */
  public list(): Array<Record<string, unknown>> {
    return [...this.keys.keys()].map((handle) => this.describe(handle));
  }

  /** Wipe and forget one key. Returns false if the handle is unknown. */
  public remove(handle: string): boolean {
    const key = this.keys.get(handle);
    if (!key) return false;
    wipe(key);
    this.keys.delete(handle);
    return true;
  }
}

/** The key store shared by every tool in this server process. */
export const keyStore = new KeyStore();
