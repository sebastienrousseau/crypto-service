// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Local in-memory KMS provider backed by crypto-lib.
 *
 * Stores keys in a `Map` — suitable for development, testing, and
 * single-process applications that do not need cloud KMS integration.
 */

import { randomBytes } from "node:crypto";
import {
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
} from "@sebastienrousseau/crypto-lib";
import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import { KmsError } from "../errors";
import {
  type VersionedKey,
  createVersionedKey,
  currentVersion,
  rotateVersionedKey,
  destroyVersion,
  sealCurrent,
  openVersioned,
  signCurrent,
  verifyAnyVersion,
} from "./versioned-key";

/** Internal key record stored in memory. */
interface LocalKeyRecord {
  metadata: KmsKeyMetadata;
  /** Every version of the key material; the last one is current. */
  key: VersionedKey;
  /** Whether the key is pending deletion. */
  pendingDeletion: boolean | undefined;
  /** Scheduled deletion timestamp. */
  deletionDate: string | undefined;
}

/** Generate a unique key ID. */
function generateId(): string {
  return `local-${bytesToHex(randomBytes(16))}`;
}

/**
 * Local in-memory KMS provider.
 *
 * Uses Node.js crypto for AES-256-GCM symmetric operations and
 * `@sebastienrousseau/crypto-lib` Ed25519 for signing operations.
 * Keys are stored in memory and do not persist across restarts.
 *
 * Rotation adds a key version rather than replacing the material:
 * ciphertext names the version that produced it, so data encrypted
 * before a rotation still decrypts, and signatures made before a rotation
 * still verify, until that version is destroyed with
 * {@link LocalKmsProvider.destroyKeyVersion}. Failures reject with a
 * {@link KmsError}.
 *
 * @example
 * ```ts
 * const provider = new LocalKmsProvider();
 * const key = await provider.createKey("aes-256-gcm", "encrypt");
 * const enc = await provider.encrypt(key.keyId, new TextEncoder().encode("hello"));
 * const dec = await provider.decrypt(key.keyId, enc.ciphertext);
 * console.log(new TextDecoder().decode(dec.plaintext)); // "hello"
 * ```
 */
export class LocalKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "local";
  /** In-memory key store mapping key IDs to records. */
  private readonly store = new Map<string, LocalKeyRecord>();

  /** Look up a key record or throw `NOT_FOUND`. */
  private record(keyId: string): LocalKeyRecord {
    const record = this.store.get(keyId);
    if (!record) {
      throw new KmsError("NOT_FOUND", `Key not found: ${keyId}`, keyId);
    }
    return record;
  }

  /** Look up an enabled key record or throw `NOT_FOUND` / `DISABLED`. */
  private enabledRecord(keyId: string): LocalKeyRecord {
    const record = this.record(keyId);
    if (!record.metadata.enabled) {
      throw new KmsError("DISABLED", `Key is disabled: ${keyId}`, keyId);
    }
    return record;
  }

  /** Look up an enabled encryption or wrapping key. */
  private cipherRecord(keyId: string, purpose: string): LocalKeyRecord {
    const record = this.enabledRecord(keyId);
    if (record.metadata.usage === "sign") {
      throw new KmsError(
        "INVALID_USAGE",
        `Key ${keyId} is a signing key, ${purpose}`,
        keyId,
      );
    }
    return record;
  }

  /** Copy of the metadata with the current version filled in. */
  private snapshot(record: LocalKeyRecord): KmsKeyMetadata {
    return {
      ...record.metadata,
      currentVersion: currentVersion(record.key).version,
    };
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  async listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const keys = Array.from(this.store.values())
      .filter((r) => !r.pendingDeletion)
      .map((r) => this.snapshot(r));

    if (!filters) return keys;

    return keys.filter(
      (k) =>
        (filters.usage === undefined || k.usage === filters.usage) &&
        (filters.enabled === undefined || k.enabled === filters.enabled),
    );
  }

  /** Retrieve metadata for a specific key by ID. */
  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    return this.snapshot(this.record(keyId));
  }

  /** Create a new key with the given algorithm and usage. */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = generateId();
    const metadata: KmsKeyMetadata = {
      keyId,
      algorithm,
      usage,
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "local",
    };
    const record: LocalKeyRecord = {
      metadata,
      key: createVersionedKey(usage),
      pendingDeletion: undefined,
      deletionDate: undefined,
    };
    this.store.set(keyId, record);
    return this.snapshot(record);
  }

  /** Enable a previously disabled key. */
  async enableKey(keyId: string): Promise<void> {
    this.record(keyId).metadata.enabled = true;
  }

  /** Disable a key so it cannot be used for operations. */
  async disableKey(keyId: string): Promise<void> {
    this.record(keyId).metadata.enabled = false;
  }

  /** Schedule a key for deletion after a pending window. */
  async scheduleKeyDeletion(
    keyId: string,
    pendingWindowDays = 30,
  ): Promise<void> {
    const record = this.record(keyId);
    record.pendingDeletion = true;
    record.metadata.enabled = false;
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + pendingWindowDays);
    record.deletionDate = deletionDate.toISOString();
  }

  /** Encrypt plaintext with AES-256-GCM under the current key version. */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const record = this.cipherRecord(keyId, "not an encryption key");
    const sealed = sealCurrent(record.key, plaintext, context);
    const result: KmsEncryptResult = {
      ciphertext: sealed.ciphertext,
      keyId,
      keyVersion: sealed.version,
    };
    if (context) {
      result.context = context;
    }
    return result;
  }

  /** Decrypt AES-256-GCM ciphertext with the key version it names. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const record = this.cipherRecord(keyId, "not an encryption key");
    const opened = openVersioned(record.key, keyId, ciphertext, context);
    return { plaintext: opened.plaintext, keyId, keyVersion: opened.version };
  }

  /** Return a signing record's key versions, or throw `INVALID_USAGE`. */
  private signingRecord(keyId: string, record: LocalKeyRecord): VersionedKey {
    if (record.metadata.usage !== "sign") {
      throw new KmsError(
        "INVALID_USAGE",
        `Key ${keyId} is not a signing key`,
        keyId,
      );
    }
    return record.key;
  }

  /** Sign data using the current Ed25519 key version. */
  async sign(
    keyId: string,
    data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    const key = this.signingRecord(keyId, this.enabledRecord(keyId));
    return {
      signature: bytesToBase64(signCurrent(key, data)),
      keyId,
      algorithm: "ed25519",
    };
  }

  /**
   * Verify an Ed25519 signature against every key version that has not
   * been destroyed. Malformed signatures verify as `false`.
   */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const key = this.signingRecord(keyId, this.record(keyId));
    return verifyAnyVersion(key, data, base64ToBytes(signature));
  }

  /**
   * Rotate the key: add a new current version while keeping earlier
   * versions for decryption and verification.
   */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.record(keyId);
    const next = rotateVersionedKey(record.key);
    record.metadata.createdAt = next.createdAt;
    return this.snapshot(record);
  }

  /**
   * Destroy the material of a non-current key version. Ciphertext and
   * signatures produced under it can no longer be used. Rejects with
   * `INVALID_ARGUMENT` for the current version and `NOT_FOUND` for an
   * unknown key or version.
   */
  async destroyKeyVersion(keyId: string, version: number): Promise<void> {
    destroyVersion(this.record(keyId).key, version, keyId);
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  async generateDataKey(
    keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    this.cipherRecord(keyId, "cannot generate data key");

    // Generate a 32-byte data encryption key and wrap it with the managed key
    const dek = new Uint8Array(randomBytes(32));
    const wrapped = await this.encrypt(keyId, dek);
    return { plaintext: dek, ciphertext: wrapped.ciphertext };
  }

  /** Wrap an existing key with the managed key. */
  async wrapKey(
    keyId: string,
    unwrappedKey: Uint8Array,
    context?: Record<string, string>,
  ): Promise<{ wrappedKey: string; keyId: string }> {
    const enc = await this.encrypt(keyId, unwrappedKey, context);
    return { wrappedKey: enc.ciphertext, keyId: enc.keyId };
  }

  /** Unwrap a wrapped key with the managed key. */
  async unwrapKey(
    keyId: string,
    wrappedKey: string,
    context?: Record<string, string>,
  ): Promise<{ unwrappedKey: Uint8Array; keyId: string }> {
    const dec = await this.decrypt(keyId, wrappedKey, context);
    return { unwrappedKey: dec.plaintext, keyId: dec.keyId };
  }
}
