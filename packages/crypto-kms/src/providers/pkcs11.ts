// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks PKCS#11-shaped provider for crypto-kms: software simulation only.
 *
 * There is no PKCS#11 binding in this package. The provider does not load a
 * PKCS#11 module, open a slot or talk to any HSM. Keys are generated and held
 * in process memory, and cryptographic operations run in software (Node.js
 * `crypto` and crypto-lib). It exists so code written against a PKCS#11-style
 * provider can be exercised in tests and CI. It provides no hardware key
 * isolation and no FIPS 140 validation, and must not protect real keys.
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

/** Configuration options for the simulated PKCS#11 provider. */
export interface Pkcs11HsmOptions {
  /** Path to a PKCS#11 shared library. Recorded only; never loaded. */
  modulePath?: string;
  /** HSM slot index (defaults to 0). */
  slotIndex?: number;
  /** HSM token label. */
  tokenLabel?: string;
  /**
   * User PIN. The simulation does not verify it: any non-empty PIN marks
   * the session as authenticated.
   */
  pin?: string;
  /** HSM model label, used only in key identifiers and diagnostics. */
  hsmModel?:
    "thales-luna" | "aws-cloudhsm" | "utimaco" | "yubihsm2" | "generic";
  /**
   * Must be `true`. No real PKCS#11 backend exists, so construction throws
   * unless the caller explicitly opts in to the in-memory simulation.
   */
  simulate?: boolean;
}

/** Diagnostic session information reported by the simulated provider. */
export interface HsmSessionInfo {
  /** Target HSM model identifier. */
  model: string;
  /** Slot index used for session. */
  slotIndex: number;
  /** Hardware token label. */
  tokenLabel: string;
  /** FIPS 140 validation level: always `"none (software simulation)"`. */
  fipsLevel: string;
  /** Always `true`: keys live in process memory, not in an HSM. */
  simulated: boolean;
  /** Whether a PIN was supplied (the PIN itself is not verified). */
  authenticated: boolean;
  /** Active session state. */
  sessionState: "CKS_RO_USER_FUNCTIONS" | "CKS_RW_USER_FUNCTIONS";
}

interface HsmKeyRecord {
  metadata: KmsKeyMetadata;
  material: Uint8Array;
  publicKey?: Uint8Array;
  pendingDeletion?: boolean;
  deletionDate?: string;
  hsmHandle: number;
}

/** Generate a PKCS#11 key identifier. */
function generateHsmKeyId(model: string): string {
  return `pkcs11-${model}-${bytesToHex(randomBytes(12))}`;
}

/**
 * Simulated PKCS#11 KMS provider.
 *
 * An in-memory software simulation of a PKCS#11-style provider for tests
 * and CI. It has no hardware backing, no key isolation and no FIPS 140
 * validation. Construction requires `simulate: true` and throws otherwise.
 *
 * @example
 * ```ts
 * const hsm = new Pkcs11HsmProvider({
 *   simulate: true,
 *   hsmModel: "thales-luna",
 *   tokenLabel: "Institutional-Vault-01",
 *   pin: "123456",
 * });
 * const key = await hsm.createKey("aes-256-gcm", "encrypt");
 * const { ciphertext } = await hsm.encrypt(key.keyId, new TextEncoder().encode("secret"));
 * ```
 */
export class Pkcs11HsmProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "pkcs11";
  /** HSM model label (diagnostic only; no device is contacted). */
  readonly hsmModel: string;
  /** Configured slot index. */
  readonly slotIndex: number;
  /** Configured token label. */
  readonly tokenLabel: string;

  private readonly store = new Map<string, HsmKeyRecord>();
  private handleCounter = 1000;
  private isAuthenticated = false;

  constructor(options: Pkcs11HsmOptions = {}) {
    if (options.simulate !== true) {
      throw new Error(
        "Pkcs11HsmProvider: no real PKCS#11 backend is implemented. " +
          "Pass { simulate: true } to use the in-memory software simulation " +
          "(tests and CI only; it provides no hardware key isolation).",
      );
    }
    this.hsmModel = options.hsmModel ?? "generic";
    this.slotIndex = options.slotIndex ?? 0;
    this.tokenLabel = options.tokenLabel ?? "HSM-DEFAULT-TOKEN";
    this.isAuthenticated = Boolean(options.pin);
  }

  /** Retrieve simulated session diagnostics. */
  getHsmSessionInfo(): HsmSessionInfo {
    return {
      model: this.hsmModel,
      slotIndex: this.slotIndex,
      tokenLabel: this.tokenLabel,
      fipsLevel: "none (software simulation)",
      simulated: true,
      authenticated: this.isAuthenticated,
      sessionState: "CKS_RW_USER_FUNCTIONS",
    };
  }

  /** List all simulated keys matching optional filters. */
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

  /** Retrieve metadata for a specific simulated key. */
  getKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    return Promise.resolve({ ...record.metadata });
  }

  /** Create a key held in process memory (not hardware-isolated). */
  createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = generateHsmKeyId(this.hsmModel);
    const hsmHandle = ++this.handleCounter;

    let material: Uint8Array;
    let publicKey: Uint8Array | undefined;

    if (usage === "sign") {
      const kp = generateEd25519KeyPair();
      material = hexToBytes(kp.privateKey);
      publicKey = hexToBytes(kp.publicKey);
    } else {
      material = randomBytes(32);
    }

    const meta: KmsKeyMetadata = {
      keyId,
      algorithm,
      usage,
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "pkcs11",
    };

    const record: HsmKeyRecord = {
      metadata: meta,
      material,
      hsmHandle,
    };
    if (publicKey !== undefined) {
      record.publicKey = publicKey;
    }

    this.store.set(keyId, record);
    return Promise.resolve({ ...meta });
  }

  /** Enable an HSM key. */
  enableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    record.metadata.enabled = true;
    return Promise.resolve();
  }

  /** Disable an HSM key. */
  disableKey(keyId: string): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    record.metadata.enabled = false;
    return Promise.resolve();
  }

  /** Schedule deletion of a simulated key. */
  scheduleKeyDeletion(keyId: string, pendingWindowDays = 7): Promise<void> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    record.pendingDeletion = true;
    const date = new Date();
    date.setDate(date.getDate() + pendingWindowDays);
    record.deletionDate = date.toISOString();
    record.metadata.enabled = false;
    return Promise.resolve();
  }

  /** Encrypt plaintext with AES-256-GCM in software. */
  encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    if (!record.metadata.enabled) {
      return Promise.reject(new Error(`HSM key is disabled: ${keyId}`));
    }
    if (
      record.metadata.usage !== "encrypt" &&
      record.metadata.usage !== "wrap"
    ) {
      return Promise.reject(
        new Error(
          `HSM key usage is '${record.metadata.usage}', expected 'encrypt'`,
        ),
      );
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(record.material),
      iv,
    );

    if (context) {
      cipher.setAAD(Buffer.from(JSON.stringify(context)));
    }

    const enc = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, enc]);

    const result: KmsEncryptResult = {
      ciphertext: bytesToBase64(new Uint8Array(payload)),
      keyId,
    };
    if (context !== undefined) {
      result.context = context;
    }

    return Promise.resolve(result);
  }

  /** Decrypt ciphertext with AES-256-GCM in software. */
  decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    if (!record.metadata.enabled) {
      return Promise.reject(new Error(`HSM key is disabled: ${keyId}`));
    }

    try {
      const data = Buffer.from(base64ToBytes(ciphertext));
      if (data.length < 28) {
        return Promise.reject(new Error("Ciphertext too short"));
      }
      const iv = data.subarray(0, 12);
      const tag = data.subarray(12, 28);
      const enc = data.subarray(28);

      const decipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(record.material),
        iv,
      );
      decipher.setAuthTag(tag);

      if (context) {
        decipher.setAAD(Buffer.from(JSON.stringify(context)));
      }

      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return Promise.resolve({
        plaintext: new Uint8Array(dec),
        keyId,
      });
    } catch {
      return Promise.reject(new Error("Decryption failed"));
    }
  }

  /** Sign data with Ed25519 in software. */
  sign(
    keyId: string,
    data: Uint8Array,
    algorithm = "Ed25519",
  ): Promise<KmsSignResult> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    if (!record.metadata.enabled) {
      return Promise.reject(new Error(`HSM key is disabled: ${keyId}`));
    }
    if (record.metadata.usage !== "sign") {
      return Promise.reject(
        new Error(
          `HSM key usage is '${record.metadata.usage}', expected 'sign'`,
        ),
      );
    }

    const result = ed25519Sign(bytesToHex(record.material), bytesToHex(data));
    return Promise.resolve({
      signature: bytesToBase64(hexToBytes(result.signature)),
      keyId,
      algorithm,
    });
  }

  /** Verify a signature against the simulated key's public key. */
  verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }
    if (record.metadata.usage !== "sign" || !record.publicKey) {
      return Promise.reject(
        new Error(
          `HSM key usage is '${record.metadata.usage}', expected 'sign'`,
        ),
      );
    }

    try {
      const sigBytes = base64ToBytes(signature);
      const result = ed25519Verify(
        bytesToHex(record.publicKey),
        bytesToHex(data),
        bytesToHex(sigBytes),
      );
      return Promise.resolve(result.valid);
    } catch {
      return Promise.resolve(false);
    }
  }

  /** Rotate a simulated key: new key material and a new simulated handle. */
  rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.store.get(keyId);
    if (!record) {
      return Promise.reject(new Error(`HSM key not found: ${keyId}`));
    }

    if (record.metadata.usage === "sign") {
      const kp = generateEd25519KeyPair();
      record.material = hexToBytes(kp.privateKey);
      record.publicKey = hexToBytes(kp.publicKey);
    } else {
      record.material = randomBytes(32);
    }

    record.hsmHandle = ++this.handleCounter;
    record.metadata.createdAt = new Date().toISOString();
    return Promise.resolve({ ...record.metadata });
  }

  /** Generate a data encryption key wrapped by the simulated key. */
  async generateDataKey(
    keyId: string,
    _keySpec = "AES_256",
  ): Promise<{ plaintext: Uint8Array; ciphertext: string }> {
    const plaintext = new Uint8Array(randomBytes(32));
    const enc = await this.encrypt(keyId, plaintext);
    return {
      plaintext,
      ciphertext: enc.ciphertext,
    };
  }
}
