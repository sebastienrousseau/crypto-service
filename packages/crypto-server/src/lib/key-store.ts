/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Server-side custody of the key pairs the v2 API generates.
 *
 * The API never takes a raw private key and never returns one, except to
 * a principal holding `crypto:keys:export` that asks for it explicitly.
 * Key generation routes store the private half here and hand back a
 * `keyId`; signing, decryption and decapsulation routes take that `keyId`.
 *
 * Each key belongs to the principal (`sub`) that generated it; another
 * principal gets "not found", exactly as for an unknown `keyId`.
 *
 * Keys live in memory. When `CRYPTO_KEY_OUT_DIR` is set, each key is also
 * written there as `<keyId>.json` (mode 0600, created exclusively, never
 * overwritten), and a key missing from memory is read back from there, so
 * keys survive a restart and are shared by replicas that share the
 * directory. The files hold the private key unencrypted, like the PGP key
 * files the server already writes there: protect the directory.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";

/** Named hex-encoded key parts, e.g. `{ publicKey }` or `{ x25519PublicKey, mlKemPublicKey }`. */
export type KeyParts = Readonly<Record<string, string>>;

/** A key pair held by the server. */
export interface StoredKey {
  /** Server-generated identifier: `k_` and 22 base64url characters. */
  readonly keyId: string;
  /** Algorithm, e.g. `ed25519`, `x25519-ml-kem-768`, `slh-dsa-sha2-128f`. */
  readonly algorithm: string;
  /** Authenticated subject that generated the key. */
  readonly owner: string;
  /** ISO 8601 creation time. */
  readonly createdAt: string;
  /** Public parts, safe to return. */
  readonly publicParts: KeyParts;
  /** Private parts: never returned outside the export route. */
  readonly privateParts: KeyParts;
}

/** A key to store; the store assigns `keyId` and `createdAt`. */
export type NewKey = Pick<
  StoredKey,
  "algorithm" | "owner" | "publicParts" | "privateParts"
>;

/** Pattern every key identifier matches (also used in route schemas). */
export const KEY_ID_PATTERN = "^k_[A-Za-z0-9_-]{22}$";

const KEY_ID_RE = new RegExp(KEY_ID_PATTERN);

/** Default number of keys held in memory. */
export const DEFAULT_KEY_CAPACITY = 10_000;

/** A key-store failure that maps to an HTTP status. */
export class KeyStoreError extends Error {
  /** HTTP status for Fastify's error handler. */
  public readonly statusCode: number;
  /** Machine-readable code. */
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "KeyStoreError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Structure of encrypted private parts serialized to disk. */
export interface EncryptedPartsPayload {
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag: string;
  readonly alg: "aes-256-gcm";
}

/** Resolves an encryption key into a 32-byte Buffer. */
function resolveStorageKey(
  key: string | Uint8Array | undefined,
): Buffer | undefined {
  if (!key) return undefined;
  if (typeof key !== "string") {
    if (key.length === 32) return Buffer.from(key);
    return createHash("sha256").update(key).digest();
  }
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return createHash("sha256").update(trimmed, "utf8").digest();
}

/** Encrypts private parts with AES-256-GCM, binding keyId and owner as AAD. */
function encryptPrivateParts(
  privateParts: KeyParts,
  keyId: string,
  owner: string,
  key: Buffer,
): EncryptedPartsPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${keyId}:${owner}`, "utf8"));
  const plaintext = Buffer.from(JSON.stringify(privateParts), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    alg: "aes-256-gcm",
  };
}

/** Decrypts private parts with AES-256-GCM, verifying AAD binding and auth tag. */
function decryptPrivateParts(
  encrypted: EncryptedPartsPayload,
  keyId: string,
  owner: string,
  key: Buffer,
): KeyParts {
  if (encrypted.alg !== "aes-256-gcm") {
    throw new KeyStoreError(
      `Unsupported encryption algorithm: ${encrypted.alg}`,
      500,
      "UNSUPPORTED_STORAGE_ALGORITHM",
    );
  }
  try {
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(`${keyId}:${owner}`, "utf8"));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as KeyParts;
  } catch {
    throw new KeyStoreError(
      "Failed to decrypt key material: invalid key or corrupted data",
      500,
      "KEY_INTEGRITY_FAILED",
    );
  }
}

/** The error for an unknown key, or one owned by someone else. */
const notFound = (): KeyStoreError =>
  new KeyStoreError("Key not found", 404, "KEY_NOT_FOUND");

/** In-memory key store, optionally persisted and encrypted on disk. */
export class KeyStore {
  private readonly keys = new Map<string, StoredKey>();
  private readonly storageKey: Buffer | undefined;

  /**
   * @param dir        Directory to persist keys to, or undefined for memory only.
   * @param capacity   Keys held in memory. Without a directory, generation
   *                   fails with 503 once it is reached; with one, the oldest
   *                   key leaves memory and is read back from disk on use.
   * @param storageKey Master key for encrypting private keys at rest (AES-256-GCM).
   *                   Accepts a 32-byte Buffer, 64-char hex string, or secret passphrase.
   */
  constructor(
    private readonly dir: string | undefined,
    private readonly capacity: number = DEFAULT_KEY_CAPACITY,
    storageKey?: string | Uint8Array,
  ) {
    this.storageKey = resolveStorageKey(storageKey);
  }

  /** Store a new key and return it with its `keyId`. */
  async put(key: NewKey): Promise<StoredKey> {
    if (!this.dir && this.keys.size >= this.capacity) {
      throw new KeyStoreError(
        "Key store is full; set CRYPTO_KEY_OUT_DIR to persist keys",
        503,
        "KEY_STORE_FULL",
      );
    }
    const stored: StoredKey = Object.freeze({
      ...key,
      keyId: `k_${randomBytes(16).toString("base64url")}`,
      createdAt: new Date().toISOString(),
    });
    if (this.dir) {
      const diskRecord: Record<string, unknown> = {
        keyId: stored.keyId,
        algorithm: stored.algorithm,
        owner: stored.owner,
        createdAt: stored.createdAt,
        publicParts: stored.publicParts,
      };

      if (this.storageKey) {
        diskRecord.encryptedPrivateParts = encryptPrivateParts(
          stored.privateParts,
          stored.keyId,
          stored.owner,
          this.storageKey,
        );
      } else {
        diskRecord.privateParts = stored.privateParts;
      }

      await writeFile(this.file(stored.keyId), JSON.stringify(diskRecord), {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      });
    }
    this.remember(stored);
    return stored;
  }

  /**
   * The key `keyId` owned by `owner`, checked against the algorithms the
   * operation accepts (any, when omitted). Throws 404 for an unknown key
   * or another owner's, and 400 for a key of another algorithm.
   */
  async get(
    keyId: string,
    owner: string,
    algorithms?: readonly string[],
  ): Promise<StoredKey> {
    const key = await this.lookup(keyId);
    if (!key || key.owner !== owner) throw notFound();
    if (algorithms && !algorithms.includes(key.algorithm)) {
      throw new KeyStoreError(
        `Key ${keyId} is a ${key.algorithm} key; this operation needs ${algorithms.join(" or ")}`,
        400,
        "KEY_ALGORITHM_MISMATCH",
      );
    }
    return key;
  }

  /** Find a key in memory, then on disk. */
  private async lookup(keyId: string): Promise<StoredKey | undefined> {
    if (!KEY_ID_RE.test(keyId)) return undefined;
    const cached = this.keys.get(keyId);
    if (cached || !this.dir) return cached;
    let raw: string;
    try {
      raw = await readFile(this.file(keyId), "utf8");
    } catch {
      return undefined;
    }
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
    if (record.keyId !== keyId) return undefined;

    let privateParts: KeyParts;
    if (record.encryptedPrivateParts) {
      if (!this.storageKey) {
        throw new KeyStoreError(
          "Key is encrypted at rest; storage key required",
          500,
          "STORAGE_KEY_REQUIRED",
        );
      }
      privateParts = decryptPrivateParts(
        record.encryptedPrivateParts as EncryptedPartsPayload,
        record.keyId as string,
        record.owner as string,
        this.storageKey,
      );
    } else if (record.privateParts) {
      privateParts = record.privateParts as KeyParts;
    } else {
      throw new KeyStoreError(
        "Key file contains no private key material",
        500,
        "KEY_CORRUPTED",
      );
    }

    const stored: StoredKey = Object.freeze({
      keyId: record.keyId as string,
      algorithm: record.algorithm as string,
      owner: record.owner as string,
      createdAt: record.createdAt as string,
      publicParts: record.publicParts as KeyParts,
      privateParts,
    });
    this.remember(stored);
    return stored;
  }

  /** Cache a key, evicting the oldest beyond capacity (persisted stores only). */
  private remember(key: StoredKey): void {
    this.keys.set(key.keyId, key);
    if (this.keys.size > this.capacity) {
      const oldest = this.keys.keys().next().value as string;
      this.keys.delete(oldest);
    }
  }

  /** The file a key is persisted in. `keyId` is validated by the caller. */
  private file(keyId: string): string {
    return path.join(this.dir as string, `${keyId}.json`);
  }
}

/** The key store configured by the environment (`CRYPTO_KEY_OUT_DIR` and `CRYPTO_KEY_STORAGE_KEY`). */
export function keyStoreFromEnv(): KeyStore {
  return new KeyStore(
    process.env["CRYPTO_KEY_OUT_DIR"] || undefined,
    DEFAULT_KEY_CAPACITY,
    process.env["CRYPTO_KEY_STORAGE_KEY"] || undefined,
  );
}
