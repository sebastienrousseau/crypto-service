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
  /** Every version of the key material; the last one is current. */
  key: VersionedKey;
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

  /** Look up a key record or throw `NOT_FOUND`. */
  private record(keyId: string): HsmKeyRecord {
    const record = this.store.get(keyId);
    if (!record) {
      throw new KmsError("NOT_FOUND", `HSM key not found: ${keyId}`, keyId);
    }
    return record;
  }

  /** Look up an enabled key record or throw `NOT_FOUND` / `DISABLED`. */
  private enabledRecord(keyId: string): HsmKeyRecord {
    const record = this.record(keyId);
    if (!record.metadata.enabled) {
      throw new KmsError("DISABLED", `HSM key is disabled: ${keyId}`, keyId);
    }
    return record;
  }

  /**
   * Return the record's key versions, or throw `INVALID_USAGE`. `encrypt`
   * accepts encryption and wrapping keys; `sign` accepts signing keys.
   */
  private requireUsage(
    keyId: string,
    record: HsmKeyRecord,
    expected: "encrypt" | "sign",
  ): VersionedKey {
    const usage = record.metadata.usage;
    const ok = expected === "sign" ? usage === "sign" : usage !== "sign";
    if (!ok) {
      throw new KmsError(
        "INVALID_USAGE",
        `HSM key usage is '${usage}', expected '${expected}'`,
        keyId,
      );
    }
    return record.key;
  }

  /** Copy of the metadata with the current version filled in. */
  private snapshot(record: HsmKeyRecord): KmsKeyMetadata {
    return {
      ...record.metadata,
      currentVersion: currentVersion(record.key).version,
    };
  }

  /** List all simulated keys matching optional filters. */
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

  /** Retrieve metadata for a specific simulated key. */
  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    return this.snapshot(this.record(keyId));
  }

  /** Create a key held in process memory (not hardware-isolated). */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = generateHsmKeyId(this.hsmModel);
    const record: HsmKeyRecord = {
      metadata: {
        keyId,
        algorithm,
        usage,
        createdAt: new Date().toISOString(),
        enabled: true,
        provider: "pkcs11",
      },
      key: createVersionedKey(usage),
      hsmHandle: ++this.handleCounter,
    };
    this.store.set(keyId, record);
    return this.snapshot(record);
  }

  /** Enable an HSM key. */
  async enableKey(keyId: string): Promise<void> {
    this.record(keyId).metadata.enabled = true;
  }

  /** Disable an HSM key. */
  async disableKey(keyId: string): Promise<void> {
    this.record(keyId).metadata.enabled = false;
  }

  /** Schedule deletion of a simulated key. */
  async scheduleKeyDeletion(
    keyId: string,
    pendingWindowDays = 7,
  ): Promise<void> {
    const record = this.record(keyId);
    record.pendingDeletion = true;
    const date = new Date();
    date.setDate(date.getDate() + pendingWindowDays);
    record.deletionDate = date.toISOString();
    record.metadata.enabled = false;
  }

  /** Encrypt plaintext with AES-256-GCM in software (current key version). */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const record = this.enabledRecord(keyId);
    const key = this.requireUsage(keyId, record, "encrypt");
    const sealed = sealCurrent(key, plaintext, context);
    const result: KmsEncryptResult = {
      ciphertext: sealed.ciphertext,
      keyId,
      keyVersion: sealed.version,
    };
    if (context !== undefined) {
      result.context = context;
    }
    return result;
  }

  /** Decrypt ciphertext with AES-256-GCM using the key version it names. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const record = this.enabledRecord(keyId);
    const key = this.requireUsage(keyId, record, "encrypt");
    const opened = openVersioned(key, keyId, ciphertext, context);
    return { plaintext: opened.plaintext, keyId, keyVersion: opened.version };
  }

  /** Sign data with Ed25519 in software (current key version). */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm = "Ed25519",
  ): Promise<KmsSignResult> {
    const record = this.enabledRecord(keyId);
    const key = this.requireUsage(keyId, record, "sign");
    return {
      signature: bytesToBase64(signCurrent(key, data)),
      keyId,
      algorithm,
    };
  }

  /**
   * Verify a signature against every simulated key version that has not
   * been destroyed. Malformed signatures verify as `false`.
   */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const key = this.requireUsage(keyId, this.record(keyId), "sign");
    return verifyAnyVersion(key, data, base64ToBytes(signature));
  }

  /**
   * Rotate a simulated key: add a new current version and a new simulated
   * handle, keeping earlier versions for decryption and verification.
   */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const record = this.record(keyId);
    const next = rotateVersionedKey(record.key);
    record.hsmHandle = ++this.handleCounter;
    record.metadata.createdAt = next.createdAt;
    return this.snapshot(record);
  }

  /**
   * Destroy the material of a non-current key version. Rejects with
   * `INVALID_ARGUMENT` for the current version and `NOT_FOUND` for an
   * unknown key or version.
   */
  async destroyKeyVersion(keyId: string, version: number): Promise<void> {
    destroyVersion(this.record(keyId).key, version, keyId);
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
