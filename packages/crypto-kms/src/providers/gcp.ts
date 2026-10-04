// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks Google Cloud KMS adapter using native Cloud KMS REST v1 API. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import { KmsError } from "../errors";

/**
 * Configuration for the Google Cloud KMS provider.
 *
 * @example
 * ```ts
 * const opts: GcpKmsOptions = {
 *   projectId: "my-project",
 *   locationId: "us-east1",
 *   keyRingId: "my-ring",
 *   token: "ya29.XXXXX",
 * };
 * ```
 */
export interface GcpKmsOptions {
  /** GCP project ID. */
  projectId: string;
  /** KMS location ID (e.g. "us-east1", "global"). */
  locationId: string;
  /** KMS key ring ID. */
  keyRingId: string;
  /** Optional OAuth2 Bearer token for authentication. */
  token?: string;
  /** Optional API endpoint override (default: "https://cloudkms.googleapis.com/v1"). */
  endpoint?: string;
}

/** Raw GCP CryptoKey resource response structure. */
interface RawGcpKey {
  name?: string;
  purpose?: string;
  createTime?: string;
  primary?: {
    name?: string;
    state?: string;
    algorithm?: string;
    createTime?: string;
  };
}

/** Parse raw JSON response text safely. */
function parseGcpResponse<T>(text: string): {
  data?: T;
  error?: { message?: string };
} {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Map GCP HTTP error responses to typed KmsError. */
function handleGcpError(
  res: Response,
  json: { error?: { message?: string } },
  keyId?: string,
): never {
  const errMsg = json.error?.message ?? `HTTP ${res.status}`;
  if (res.status === 404 || /not found/i.test(errMsg)) {
    throw new KmsError("NOT_FOUND", errMsg, keyId);
  }
  if (res.status === 400 && /decryption|ciphertext/i.test(errMsg)) {
    throw new KmsError("DECRYPTION_FAILED", errMsg, keyId);
  }
  if (/disabled|destroy/i.test(errMsg)) {
    throw new KmsError("DISABLED", errMsg, keyId);
  }
  throw new KmsError("INVALID_ARGUMENT", `GCP KMS error: ${errMsg}`, keyId);
}

/** Map algorithm and usage to GCP KMS version template algorithm. */
function mapGcpAlgorithm(
  algorithm: string,
  usage: "encrypt" | "sign" | "wrap",
): string {
  const upper = algorithm.toUpperCase();
  if (usage === "sign") {
    if (upper.includes("EC") || upper.includes("P256")) {
      return "EC_SIGN_P256_SHA256";
    }
    return "RSA_SIGN_PSS_2048_SHA256";
  }
  return "GOOGLE_SYMMETRIC_ENCRYPTION";
}

/** Extract short key identifier from GCP resource name. */
function extractGcpKeyId(fullName?: string): string {
  if (!fullName) return "";
  const idx = fullName.lastIndexOf("/");
  return idx >= 0 ? fullName.slice(idx + 1) : fullName;
}

/** Convert raw GCP CryptoKey to KmsKeyMetadata. */
function mapGcpKey(raw: RawGcpKey, fallbackId: string): KmsKeyMetadata {
  const keyId = extractGcpKeyId(raw.name) || fallbackId;
  const isSign = raw.purpose === "ASYMMETRIC_SIGN";
  return {
    keyId,
    algorithm: raw.primary?.algorithm ?? "GOOGLE_SYMMETRIC_ENCRYPTION",
    usage: isSign ? "sign" : "encrypt",
    createdAt: raw.createTime ?? new Date().toISOString(),
    enabled:
      raw.primary?.state !== "DISABLED" && raw.primary?.state !== "DESTROYED",
    provider: "gcp",
  };
}

/**
 * Google Cloud KMS adapter.
 *
 * Uses the Google Cloud KMS REST API v1 via native `fetch` with zero SDK dependencies.
 *
 * @example
 * ```ts
 * const provider = new GcpKmsProvider({
 *   projectId: "my-project",
 *   locationId: "us-east1",
 *   keyRingId: "my-ring",
 *   token: "ya29.XXXXX",
 * });
 * const key = await provider.createKey("aes-256-gcm", "encrypt");
 * ```
 */
export class GcpKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "gcp";
  /** GCP KMS configuration options. */
  private readonly options: GcpKmsOptions;

  /** Create a GCP KMS provider with the given options. */
  constructor(options: GcpKmsOptions) {
    this.options = options;
  }

  /** Build parent resource name for the configured key ring. */
  private getParent(): string {
    return `projects/${this.options.projectId}/locations/${this.options.locationId}/keyRings/${this.options.keyRingId}`;
  }

  /** Build full key resource name. */
  private getKeyName(keyId: string): string {
    if (keyId.startsWith("projects/")) return keyId;
    return `${this.getParent()}/cryptoKeys/${keyId}`;
  }

  /** Build a sanitized GCP Cloud KMS API URL. */
  private buildUrl(path: string): string {
    if (!/^[a-zA-Z0-9_\-/:.?=&]+$/.test(path) || path.includes("..")) {
      throw new KmsError("INVALID_ARGUMENT", "Invalid GCP KMS path", path);
    }
    const endpoint =
      this.options.endpoint ?? "https://cloudkms.googleapis.com/v1";
    const base = `${endpoint.replace(/\/+$/, "")}/`;
    return new URL(path, base).href;
  }

  /** Send authenticated request to GCP Cloud KMS API. */
  private async request<T>(
    path: string,
    method = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.options.token) {
      headers["Authorization"] = `Bearer ${this.options.token}`;
    }
    const reqInit: RequestInit = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    let res: Response;
    try {
      res = await fetch(url, reqInit);
    } catch (err) {
      throw new KmsError(
        "INVALID_ARGUMENT",
        `GCP KMS network error: ${(err as Error).message}`,
        path,
      );
    }
    const text = await res.text();
    const json = parseGcpResponse<T>(text);
    if (!res.ok) {
      handleGcpError(res, json, path);
    }
    return (json.data ?? (json as unknown as T)) as T;
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  async listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const path = `${this.getParent()}/cryptoKeys`;
    const res = await this.request<{ cryptoKeys?: RawGcpKey[] }>(path);
    let keys = (res.cryptoKeys ?? []).map((k) => mapGcpKey(k, ""));
    if (filters?.usage) {
      keys = keys.filter((k) => k.usage === filters.usage);
    }
    if (filters?.enabled !== undefined) {
      keys = keys.filter((k) => k.enabled === filters.enabled);
    }
    return keys;
  }

  /** Retrieve metadata for a specific key by ID. */
  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    const path = this.getKeyName(keyId);
    const res = await this.request<RawGcpKey>(path);
    return mapGcpKey(res, keyId);
  }

  /** Create a new key with the given algorithm and usage. */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId = `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${this.getParent()}/cryptoKeys?cryptoKeyId=${keyId}`;
    const purpose = usage === "sign" ? "ASYMMETRIC_SIGN" : "ENCRYPT_DECRYPT";
    const body: Record<string, unknown> = {
      purpose,
      versionTemplate: {
        algorithm: mapGcpAlgorithm(algorithm, usage),
      },
      ...(metadata ? { labels: metadata } : {}),
    };
    const res = await this.request<RawGcpKey>(path, "POST", body);
    return mapGcpKey(res, keyId);
  }

  /** Enable a previously disabled key version. */
  async enableKey(keyId: string): Promise<void> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions/1?updateMask=state`;
    await this.request(path, "PATCH", { state: "ENABLED" });
  }

  /** Disable a key version so it cannot be used for operations. */
  async disableKey(keyId: string): Promise<void> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions/1?updateMask=state`;
    await this.request(path, "PATCH", { state: "DISABLED" });
  }

  /** Schedule a key version for destruction. */
  async scheduleKeyDeletion(
    keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions/1:destroy`;
    await this.request(path, "POST", {});
  }

  /** Encrypt plaintext using a managed key. */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const path = `${this.getKeyName(keyId)}:encrypt`;
    const body: Record<string, unknown> = {
      plaintext: Buffer.from(plaintext).toString("base64"),
      ...(context
        ? {
            additionalAuthenticatedData: Buffer.from(
              JSON.stringify(context),
            ).toString("base64"),
          }
        : {}),
    };
    const res = await this.request<{ ciphertext: string }>(path, "POST", body);
    const out: KmsEncryptResult = {
      ciphertext: res.ciphertext,
      keyId,
    };
    if (context) {
      out.context = context;
    }
    return out;
  }

  /** Decrypt ciphertext using a managed key. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const path = `${this.getKeyName(keyId)}:decrypt`;
    const body: Record<string, unknown> = {
      ciphertext,
      ...(context
        ? {
            additionalAuthenticatedData: Buffer.from(
              JSON.stringify(context),
            ).toString("base64"),
          }
        : {}),
    };
    const res = await this.request<{ plaintext: string }>(path, "POST", body);
    return {
      plaintext: new Uint8Array(Buffer.from(res.plaintext, "base64")),
      keyId,
    };
  }

  /** Sign data using a managed signing key. */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm?: string,
  ): Promise<KmsSignResult> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions/1:asymmetricSign`;
    const body = {
      data: Buffer.from(data).toString("base64"),
    };
    const res = await this.request<{ signature: string }>(path, "POST", body);
    return {
      signature: res.signature,
      keyId,
      algorithm: algorithm ?? "RSA_SIGN_PSS_2048_SHA256",
    };
  }

  /** Verify a signature against data. */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    try {
      const path = `${this.getKeyName(keyId)}/cryptoKeyVersions/1:macVerify`;
      const body = {
        data: Buffer.from(data).toString("base64"),
        mac: signature,
      };
      const res = await this.request<{ success?: boolean }>(path, "POST", body);
      return Boolean(res.success);
    } catch {
      return false;
    }
  }

  /** Rotate a key by creating a new version. */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions`;
    await this.request(path, "POST", {});
    return this.getKey(keyId);
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  async generateDataKey(
    keyId: string,
    keySpec?: string,
  ): Promise<{
    plaintext: Uint8Array;
    ciphertext: string;
  }> {
    const len = keySpec === "AES_128" ? 16 : 32;
    const plaintext = new Uint8Array(len);
    crypto.getRandomValues(plaintext);
    const enc = await this.encrypt(keyId, plaintext);
    return {
      plaintext,
      ciphertext: enc.ciphertext,
    };
  }

  /** Wrap an existing key with the managed key. */
  async wrapKey(
    keyId: string,
    unwrappedKey: Uint8Array,
    context?: Record<string, string>,
  ): Promise<{ wrappedKey: string; keyId: string }> {
    const enc = await this.encrypt(keyId, unwrappedKey, context);
    return { wrappedKey: enc.ciphertext, keyId };
  }

  /** Unwrap a wrapped key with the managed key. */
  async unwrapKey(
    keyId: string,
    wrappedKey: string,
    context?: Record<string, string>,
  ): Promise<{ unwrappedKey: Uint8Array; keyId: string }> {
    const dec = await this.decrypt(keyId, wrappedKey, context);
    return { unwrappedKey: dec.plaintext, keyId };
  }
}
