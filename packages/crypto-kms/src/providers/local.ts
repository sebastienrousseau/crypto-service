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
  readonly name = "local";
  private readonly store = new Map<string, LocalKeyRecord>();

  /** Generate a unique key ID. */
  private generateId(): string {
    return `local-${bytesToHex(randomBytes(16))}`;
  }

  async listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const keys = Array.from(this.store.values())
      .filter((r) => !r.pendingDeletion)
      .map((r) => r.metadata);

    if (!filters) return keys;

    return keys.filter((k) => {
      if (filters.usage !== undefined && k.usage !== filters.usage)
        return false;
      if (filters.enabled !== undefined && k.enabled !== filters.enabled)
        return false;
      return true;
    });
  }

  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    return { ...record.metadata };
  }

  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = this.generateId();
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
    return { ...metadata };
  }

  async enableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    record.metadata.enabled = true;
  }

  async disableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    record.metadata.enabled = false;
  }

  async scheduleKeyDeletion(
    keyId: string,
    pendingWindowDays = 30,
  ): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    record.pendingDeletion = true;
    record.metadata.enabled = false;
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + pendingWindowDays);
    record.deletionDate = deletionDate.toISOString();
  }

  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    if (!record.metadata.enabled) throw new Error(`Key is disabled: ${keyId}`);
    if (record.metadata.usage === "sign")
      throw new Error(`Key ${keyId} is a signing key, not an encryption key`);

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
    return result;
  }

  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    if (!record.metadata.enabled) throw new Error(`Key is disabled: ${keyId}`);
    if (record.metadata.usage === "sign")
      throw new Error(`Key ${keyId} is a signing key, not an encryption key`);

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
    return {
      plaintext: new Uint8Array(decrypted),
      keyId,
    };
  }

  async sign(
    keyId: string,
    data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    if (!record.metadata.enabled) throw new Error(`Key is disabled: ${keyId}`);
    if (record.metadata.usage !== "sign")
      throw new Error(`Key ${keyId} is not a signing key`);

    const result = ed25519Sign(bytesToHex(record.material), bytesToHex(data));

    return {
      signature: bytesToBase64(hexToBytes(result.signature)),
      keyId,
      algorithm: "ed25519",
    };
  }

  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    if (record.metadata.usage !== "sign")
      throw new Error(`Key ${keyId} is not a signing key`);
    if (!record.publicKey) throw new Error(`Key ${keyId} has no public key`);

    const result = ed25519Verify(
      bytesToHex(record.publicKey),
      bytesToHex(data),
      bytesToHex(base64ToBytes(signature)),
    );

    return result.valid;
  }

  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);

    // Generate new key material
    if (record.metadata.usage === "sign") {
      const kp = generateEd25519KeyPair();
      record.material = hexToBytes(kp.privateKey);
      record.publicKey = hexToBytes(kp.publicKey);
    } else {
      record.material = randomBytes(32);
    }

    record.metadata.createdAt = new Date().toISOString();
    return { ...record.metadata };
  }

  async generateDataKey(
    keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    const record = this.store.get(keyId);
    if (!record) throw new Error(`Key not found: ${keyId}`);
    if (!record.metadata.enabled) throw new Error(`Key is disabled: ${keyId}`);
    if (record.metadata.usage === "sign")
      throw new Error(
        `Key ${keyId} is a signing key, cannot generate data key`,
      );

    // Generate a 32-byte data encryption key
    const dek = randomBytes(32);

    // Wrap the DEK with the managed key
    const wrapped = await this.encrypt(keyId, dek);

    return {
      plaintext: new Uint8Array(dek),
      ciphertext: wrapped.ciphertext,
    };
  }
}
