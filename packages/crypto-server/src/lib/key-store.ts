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
 * directory.
 *
 * With `CRYPTO_KEY_STORAGE_KEY` (64 hex characters) the private parts are
 * encrypted with AES-256-GCM, authenticated together with the rest of the
 * record (keyId, owner, algorithm, creation time and public parts), and a
 * plaintext record is refused unless `CRYPTO_KEY_ALLOW_PLAINTEXT=1` (for a
 * migration). Without it the private parts are written in plaintext,
 * which a production server refuses unless `CRYPTO_KEY_ALLOW_PLAINTEXT=1`.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { constants as fsConstants } from "fs";
import { access, readFile, unlink, writeFile } from "fs/promises";
import * as path from "path";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import { integerSetting } from "../config/settings";

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

/** Default number of keys one principal may hold. */
export const DEFAULT_KEYS_PER_OWNER = 1_000;

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
  /**
   * What the tag authenticates besides the private parts: "record-v2" for
   * the whole record; absent in records written before 0.0.36, which bind
   * only `keyId:owner`.
   */
  readonly aad?: "record-v2";
}

/** The fields of a record that are authenticated with its private parts. */
type RecordHeader = Pick<
  StoredKey,
  "keyId" | "owner" | "algorithm" | "createdAt" | "publicParts"
>;

/** Explains the storage key format; used for every rejection. */
const STORAGE_KEY_FORMAT =
  "CRYPTO_KEY_STORAGE_KEY must be 64 hex characters (32 random bytes, for example from `openssl rand -hex 32`). " +
  "A passphrase is not accepted; to read files written with one, set the hex SHA-256 of that passphrase and re-encrypt.";

/** Why a storage key setting is unusable, or null. */
function storageKeyError(key: string | Uint8Array | undefined): string | null {
  if (key === undefined) return null;
  if (typeof key !== "string") {
    return key.length === 32 ? null : "The storage key must be 32 bytes";
  }
  const trimmed = key.trim();
  return trimmed === "" || /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? null
    : STORAGE_KEY_FORMAT;
}

/** The 32-byte storage key, undefined when none is set; throws when malformed. */
function resolveStorageKey(
  key: string | Uint8Array | undefined,
): Buffer | undefined {
  const error = storageKeyError(key);
  if (error) throw new Error(error);
  if (key === undefined) return undefined;
  if (typeof key !== "string") return Buffer.from(key);
  const trimmed = key.trim();
  return trimmed === "" ? undefined : Buffer.from(trimmed, "hex");
}

/** Authenticated data for a record: every field except the private parts. */
function recordAad(header: RecordHeader, version: "record-v2" | undefined) {
  if (version !== "record-v2") {
    return Buffer.from(`${header.keyId}:${header.owner}`, "utf8");
  }
  const publicParts = Object.entries(header.publicParts).sort(([a], [b]) =>
    a < b ? -1 : 1,
  );
  return Buffer.from(
    JSON.stringify([
      "record-v2",
      header.keyId,
      header.owner,
      header.algorithm,
      header.createdAt,
      publicParts,
    ]),
    "utf8",
  );
}

/** Encrypts private parts with AES-256-GCM, binding the whole record. */
function encryptPrivateParts(
  privateParts: KeyParts,
  header: RecordHeader,
  key: Buffer,
): EncryptedPartsPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(recordAad(header, "record-v2"));
  const plaintext = Buffer.from(JSON.stringify(privateParts), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  wipeMemory(plaintext);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    alg: "aes-256-gcm",
    aad: "record-v2",
  };
}

/** Decrypts private parts with AES-256-GCM, verifying AAD binding and auth tag. */
function decryptPrivateParts(
  encrypted: EncryptedPartsPayload,
  header: RecordHeader,
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
    decipher.setAAD(recordAad(header, encrypted.aad));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as KeyParts;
    wipeMemory(decrypted);
    return parsed;
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
/** Options of a {@link KeyStore}. */
export interface KeyStoreOptions {
  /**
   * Read plaintext records even though a storage key is set, while
   * existing keys are migrated to encrypted records. Default false.
   */
  readonly acceptPlaintext?: boolean;
  /**
   * Keys one principal may create ({@link DEFAULT_KEYS_PER_OWNER} by
   * default), so one principal cannot fill the store for everyone. Keys
   * are counted from when this store was created; deleting one frees its
   * place.
   */
  readonly maxKeysPerOwner?: number;
}

export class KeyStore {
  private readonly keys = new Map<string, StoredKey>();
  private readonly storageKey: Buffer | undefined;
  private readonly acceptPlaintext: boolean;
  private readonly maxKeysPerOwner: number;
  /** Keys created per owner since this store was created. */
  private readonly ownerCounts = new Map<string, number>();

  /**
   * @param dir        Directory to persist keys to, or undefined for memory only.
   * @param capacity   Keys held in memory. Without a directory, generation
   *                   fails with 503 once it is reached; with one, the oldest
   *                   key leaves memory and is read back from disk on use.
   * @param storageKey Master key for encrypting private keys at rest
   *                   (AES-256-GCM): 32 bytes, or 64 hex characters.
   *                   Anything else throws.
   * @param options    See {@link KeyStoreOptions}.
   */
  constructor(
    private readonly dir: string | undefined,
    private readonly capacity: number = DEFAULT_KEY_CAPACITY,
    storageKey?: string | Uint8Array,
    options: KeyStoreOptions = {},
  ) {
    this.storageKey = resolveStorageKey(storageKey);
    this.acceptPlaintext = options.acceptPlaintext ?? false;
    this.maxKeysPerOwner = options.maxKeysPerOwner ?? DEFAULT_KEYS_PER_OWNER;
  }

  /** Store a new key and return it with its `keyId`. */
  async put(key: NewKey): Promise<StoredKey> {
    const owned = this.ownerCounts.get(key.owner) ?? 0;
    if (owned >= this.maxKeysPerOwner) {
      throw new KeyStoreError(
        `Key quota of ${this.maxKeysPerOwner} reached; delete keys to create more`,
        429,
        "KEY_QUOTA_EXCEEDED",
      );
    }
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
          stored,
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
    this.ownerCounts.set(key.owner, owned + 1);
    return stored;
  }

  /** Whether keys can be written: always in memory, else if the directory is writable. */
  async writable(): Promise<boolean> {
    if (!this.dir) return true;
    return access(this.dir, fsConstants.W_OK).then(
      () => true,
      () => false,
    );
  }

  /**
   * Delete the key `keyId` owned by `owner`, from memory and disk. Throws
   * 404 for an unknown key or another owner's, as {@link get} does.
   */
  async delete(keyId: string, owner: string): Promise<void> {
    await this.get(keyId, owner);
    this.keys.delete(keyId);
    if (this.dir) await unlink(this.file(keyId));
    const owned = this.ownerCounts.get(owner) ?? 0;
    if (owned > 0) this.ownerCounts.set(owner, owned - 1);
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
    if (cached) {
      this.remember(cached); // most recently used
      return cached;
    }
    if (!this.dir) return undefined;
    const record = await this.readRecord(keyId);
    if (!record) return undefined;
    const stored: StoredKey = Object.freeze({
      keyId: record.keyId as string,
      algorithm: record.algorithm as string,
      owner: record.owner as string,
      createdAt: record.createdAt as string,
      publicParts: record.publicParts as KeyParts,
      privateParts: this.privatePartsOf(record),
    });
    this.remember(stored);
    return stored;
  }

  /** The parsed record file of `keyId`, or undefined if absent or invalid. */
  private async readRecord(
    keyId: string,
  ): Promise<Record<string, unknown> | undefined> {
    try {
      const raw = await readFile(this.file(keyId), "utf8");
      const record = JSON.parse(raw) as Record<string, unknown>;
      return record.keyId === keyId ? record : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * The private parts of a record: decrypted when encrypted; plaintext
   * only when no storage key is set or plaintext is accepted for a
   * migration.
   */
  private privatePartsOf(record: Record<string, unknown>): KeyParts {
    if (record.encryptedPrivateParts) {
      if (!this.storageKey) {
        throw new KeyStoreError(
          "Key is encrypted at rest; storage key required",
          500,
          "STORAGE_KEY_REQUIRED",
        );
      }
      return decryptPrivateParts(
        record.encryptedPrivateParts as EncryptedPartsPayload,
        record as unknown as RecordHeader,
        this.storageKey,
      );
    }
    if (!record.privateParts) {
      throw new KeyStoreError(
        "Key file contains no private key material",
        500,
        "KEY_CORRUPTED",
      );
    }
    if (this.storageKey && !this.acceptPlaintext) {
      throw new KeyStoreError(
        "Plaintext key file refused while CRYPTO_KEY_STORAGE_KEY is set; set CRYPTO_KEY_ALLOW_PLAINTEXT=1 to read it while migrating",
        500,
        "PLAINTEXT_KEY_REFUSED",
      );
    }
    return record.privateParts as KeyParts;
  }

  /**
   * Cache a key as the most recently used, evicting the least recently
   * used beyond capacity (persisted stores only; they can read it back).
   */
  private remember(key: StoredKey): void {
    this.keys.delete(key.keyId);
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

/**
 * Why the key-store settings cannot be used, or null: a malformed
 * `CRYPTO_KEY_STORAGE_KEY`, or a production server persisting keys in
 * plaintext without `CRYPTO_KEY_ALLOW_PLAINTEXT=1`.
 */
export function keyStoreConfigError(env: NodeJS.ProcessEnv): string | null {
  const keyError =
    storageKeyError(env["CRYPTO_KEY_STORAGE_KEY"]) ?? perOwnerError(env);
  if (keyError) return keyError;
  const plaintextOnDisk =
    env["NODE_ENV"] === "production" &&
    Boolean(env["CRYPTO_KEY_OUT_DIR"]) &&
    !env["CRYPTO_KEY_STORAGE_KEY"]?.trim();
  return plaintextOnDisk && env["CRYPTO_KEY_ALLOW_PLAINTEXT"] !== "1"
    ? "CRYPTO_KEY_OUT_DIR is set without CRYPTO_KEY_STORAGE_KEY, so private keys would be written in plaintext; set CRYPTO_KEY_STORAGE_KEY (or CRYPTO_KEY_ALLOW_PLAINTEXT=1 to accept it)"
    : null;
}

/** KEY_STORE_MAX_PER_PRINCIPAL, or the default when unset. */
function maxKeysPerOwner(env: NodeJS.ProcessEnv): number {
  return integerSetting(
    env,
    "KEY_STORE_MAX_PER_PRINCIPAL",
    DEFAULT_KEYS_PER_OWNER,
    1,
  );
}

/** Why KEY_STORE_MAX_PER_PRINCIPAL is invalid, or undefined. */
function perOwnerError(env: NodeJS.ProcessEnv): string | undefined {
  try {
    maxKeysPerOwner(env);
    return undefined;
  } catch (e) {
    return (e as Error).message;
  }
}

/** The key store configured by the environment; throws on invalid settings. */
export function keyStoreFromEnv(): KeyStore {
  const error = keyStoreConfigError(process.env);
  if (error) throw new Error(error);
  return new KeyStore(
    process.env["CRYPTO_KEY_OUT_DIR"] || undefined,
    DEFAULT_KEY_CAPACITY,
    process.env["CRYPTO_KEY_STORAGE_KEY"] || undefined,
    {
      acceptPlaintext: process.env["CRYPTO_KEY_ALLOW_PLAINTEXT"] === "1",
      maxKeysPerOwner: maxKeysPerOwner(process.env),
    },
  );
}
