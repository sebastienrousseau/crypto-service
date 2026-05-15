// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Local in-memory KMS provider backed by crypto-lib.
 *
 * Stores keys in a `Map` — suitable for development, testing, and
 * single-process applications that do not need cloud KMS integration.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import {
  generateEd25519KeyPair,
  ed25519Sign,
  ed25519Verify,
  bytesToHex,
  hexToBytes,
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

/** Internal key record stored in memory. */
interface LocalKeyRecord {
  metadata: KmsKeyMetadata;
  /** Raw key material (symmetric key bytes or serialized key pair). */
  material: Uint8Array;
  /** For signing keys: the public key bytes. */
  publicKey: Uint8Array | undefined;
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

  /** List all keys, optionally filtered by usage or enabled state. */
  listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const keys = Array.from(this.store.values())
      .filter((r) => !r.pendingDeletion)
      .map((r) => r.metadata);

    if (!filters) return Promise.resolve(keys);

    return Promise.resolve(
      keys.filter(
        (k) =>
          (filters.usage === undefined || k.usage === filters.usage) &&
          (filters.enabled === undefined || k.enabled === filters.enabled),
      ),
    );
  }

  /** Retrieve metadata for a specific key by ID. */
  getKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    return Promise.resolve({ ...record.metadata });
  }

  /** Create a new key with the given algorithm and usage. */
  createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = generateId();
    let material: Uint8Array;
    let publicKey: Uint8Array | undefined;

    if (usage === "sign") {
      // Ed25519 signing key pair
      const kp = generateEd25519KeyPair();
      material = hexToBytes(kp.privateKey);
      publicKey = hexToBytes(kp.publicKey);
    } else {
      // AES-256 symmetric key (32 bytes)
      material = randomBytes(32);
      publicKey = undefined;
    }

    const metadata: KmsKeyMetadata = {
      keyId,
      algorithm,
      usage,
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "local",
    };

    this.store.set(keyId, {
      metadata,
      material,
      publicKey,
      pendingDeletion: undefined,
      deletionDate: undefined,
    });
    return Promise.resolve({ ...metadata });
  }

  /** Enable a previously disabled key. */
  enableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    record.metadata.enabled = true;
    return Promise.resolve();
  }

  /** Disable a key so it cannot be used for operations. */
  disableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    record.metadata.enabled = false;
    return Promise.resolve();
  }

  /** Schedule a key for deletion after a pending window. */
  scheduleKeyDeletion(keyId: string, pendingWindowDays = 30): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    record.pendingDeletion = true;
    record.metadata.enabled = false;
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + pendingWindowDays);
    record.deletionDate = deletionDate.toISOString();
    return Promise.resolve();
  }

  /** Encrypt plaintext with AES-256-GCM using the managed key. */
  encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    if (!record.metadata.enabled)
      return Promise.reject(new Error(`Key is disabled: ${keyId}`));
    if (record.metadata.usage === "sign")
      return Promise.reject(
        new Error(`Key ${keyId} is a signing key, not an encryption key`),
      );

    const iv = randomBytes(12);
    const aad = context ? Buffer.from(JSON.stringify(context)) : undefined;
    const cipher = createCipheriv("aes-256-gcm", record.material, iv);
    if (aad) cipher.setAAD(aad);

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Pack: iv (12) + tag (16) + ciphertext
    const packed = Buffer.concat([iv, tag, encrypted]);

    const result: KmsEncryptResult = {
      ciphertext: bytesToBase64(packed),
      keyId,
    };
    if (context) {
      result.context = context;
    }
    return Promise.resolve(result);
  }

  /** Decrypt AES-256-GCM ciphertext using the managed key. */
  decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    if (!record.metadata.enabled)
      return Promise.reject(new Error(`Key is disabled: ${keyId}`));
    if (record.metadata.usage === "sign")
      return Promise.reject(
        new Error(`Key ${keyId} is a signing key, not an encryption key`),
      );

    const packed = base64ToBytes(ciphertext);
    const iv = packed.slice(0, 12);
    const tag = packed.slice(12, 28);
    const encryptedData = packed.slice(28);

    const aad = context ? Buffer.from(JSON.stringify(context)) : undefined;
    const decipher = createDecipheriv("aes-256-gcm", record.material, iv);
    decipher.setAuthTag(tag);
    if (aad) decipher.setAAD(aad);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    return Promise.resolve({
      plaintext: new Uint8Array(decrypted),
      keyId,
    });
  }

  /** Sign data using the Ed25519 signing key. */
  sign(
    keyId: string,
    data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    if (!record.metadata.enabled)
      return Promise.reject(new Error(`Key is disabled: ${keyId}`));
    if (record.metadata.usage !== "sign")
      return Promise.reject(new Error(`Key ${keyId} is not a signing key`));

    const result = ed25519Sign(bytesToHex(record.material), bytesToHex(data));

    return Promise.resolve({
      signature: bytesToBase64(hexToBytes(result.signature)),
      keyId,
      algorithm: "ed25519",
    });
  }

  /** Verify an Ed25519 signature against data. */
  verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    if (record.metadata.usage !== "sign")
      return Promise.reject(new Error(`Key ${keyId} is not a signing key`));
    if (!record.publicKey)
      return Promise.reject(new Error(`Key ${keyId} has no public key`));

    const result = ed25519Verify(
      bytesToHex(record.publicKey),
      bytesToHex(data),
      bytesToHex(base64ToBytes(signature)),
    );

    return Promise.resolve(result.valid);
  }

  /** Rotate key material while preserving the key ID and metadata. */
  rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));

    // Generate new key material
    if (record.metadata.usage === "sign") {
      const kp = generateEd25519KeyPair();
      record.material = hexToBytes(kp.privateKey);
      record.publicKey = hexToBytes(kp.publicKey);
    } else {
      record.material = randomBytes(32);
    }

    record.metadata.createdAt = new Date().toISOString();
    return Promise.resolve({ ...record.metadata });
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  generateDataKey(
    keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    const record = this.store.get(keyId);
    if (!record) return Promise.reject(new Error(`Key not found: ${keyId}`));
    if (!record.metadata.enabled)
      return Promise.reject(new Error(`Key is disabled: ${keyId}`));
    if (record.metadata.usage === "sign")
      return Promise.reject(
        new Error(`Key ${keyId} is a signing key, cannot generate data key`),
      );

    // Generate a 32-byte data encryption key
    const dek = randomBytes(32);

    // Wrap the DEK with the managed key
    return this.encrypt(keyId, dek).then((wrapped) => ({
      plaintext: new Uint8Array(dek),
      ciphertext: wrapped.ciphertext,
    }));
  }
}
