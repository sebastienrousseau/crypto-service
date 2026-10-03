// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks HashiCorp Vault Transit secrets engine adapter. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import { KmsError } from "../errors";

/**
 * Configuration for the HashiCorp Vault provider.
 *
 * @example
 * ```ts
 * const opts: VaultKmsOptions = {
 *   address: "http://127.0.0.1:8200",
 *   token: "hvs.XXXXX",
 *   mountPath: "transit",
 * };
 * ```
 */
export interface VaultKmsOptions {
  /** Vault server address (e.g. "http://127.0.0.1:8200"). */
  address: string;
  /** Vault authentication token. */
  token: string;
  /** Transit engine mount path (default: "transit"). */
  mountPath?: string;
  /** Optional Vault enterprise namespace. */
  namespace?: string;
}

/** Vault Transit API key details response structure. */
interface VaultKeyDetails {
  name?: string;
  type?: string;
  supports_encryption?: boolean;
  supports_decryption?: boolean;
  supports_signing?: boolean;
  supports_derivation?: boolean;
  latest_version?: number;
  min_decryption_version?: number;
  min_encryption_version?: number;
  deletion_allowed?: boolean;
  keys?: Record<string, number | string>;
}

/** Parse raw Vault JSON response text safely. */
function parseVaultResponse<T>(text: string): { data?: T; errors?: string[] } {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Map Vault HTTP error responses to typed KmsError. */
function handleVaultError(
  res: Response,
  json: { errors?: string[] },
  keyId?: string,
): never {
  const errMsg = json.errors?.join(", ") ?? `HTTP ${res.status}`;
  if (
    res.status === 400 &&
    /ciphertext.*invalid|decryption failed/i.test(errMsg)
  ) {
    throw new KmsError("DECRYPTION_FAILED", errMsg, keyId);
  }
  if (/disabled/i.test(errMsg)) {
    throw new KmsError("DISABLED", errMsg, keyId);
  }
  throw new KmsError("INVALID_ARGUMENT", `Vault error: ${errMsg}`, keyId);
}

/**
 * HashiCorp Vault Transit secrets engine adapter.
 *
 * Uses the Vault HTTP API to provide the unified KmsProvider interface.
 * No additional SDK dependency is required — uses native `fetch`.
 *
 * @example
 * ```ts
 * const provider = new VaultKmsProvider({
 *   address: "http://127.0.0.1:8200",
 *   token: "hvs.XXXXX",
 *   mountPath: "transit",
 * });
 * const key = await provider.createKey("aes256-gcm96", "encrypt");
 * ```
 */
export class VaultKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "vault";
  /** Vault server address. */
  private readonly _address: string;
  /** Vault authentication token. */
  private readonly _token: string;
  /** Transit engine mount path. */
  private readonly _mount: string;
  /** Optional Vault enterprise namespace. */
  private readonly _namespace?: string | undefined;

  /** Create a Vault Transit provider with the given options. */
  constructor(options: VaultKmsOptions) {
    this._address = options.address;
    this._token = options.token;
    this._mount = options.mountPath ?? "transit";
    this._namespace = options.namespace;
  }

  /** Build a Vault API URL for the transit engine. */
  buildUrl(path: string): string {
    const base = this._address.replace(/\/+$/, "");
    return `${base}/v1/${this._mount}/${path}`;
  }

  /** Common headers for Vault API requests. */
  buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Vault-Token": this._token,
      "Content-Type": "application/json",
    };
    if (this._namespace) {
      headers["X-Vault-Namespace"] = this._namespace;
    }
    return headers;
  }

  /** Helper to perform authenticated HTTP requests to Vault. */
  private async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    keyId?: string,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const reqInit: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      reqInit.body = JSON.stringify(body);
    }
    let res: Response;
    try {
      res = await fetch(url, reqInit);
    } catch (err) {
      throw new KmsError(
        "INVALID_ARGUMENT",
        `Vault request failed: ${(err as Error).message}`,
        keyId,
      );
    }

    if (res.status === 404) {
      throw new KmsError("NOT_FOUND", `Vault path not found: ${path}`, keyId);
    }

    const text = await res.text();
    const json = parseVaultResponse<T>(text);

    if (!res.ok) {
      handleVaultError(res, json, keyId);
    }

    return (json.data ?? json) as T;
  }

  /** Map Vault key details to KmsKeyMetadata. */
  private mapMetadata(keyId: string, details: VaultKeyDetails): KmsKeyMetadata {
    const usage = details.supports_signing ? "sign" : "encrypt";
    const minEnc = details.min_encryption_version ?? 0;
    const latest = details.latest_version ?? 1;
    const enabled = minEnc <= latest;

    const meta: KmsKeyMetadata = {
      keyId,
      algorithm: details.type ?? "aes256-gcm96",
      usage,
      createdAt: new Date().toISOString(),
      enabled,
      provider: "vault",
    };
    if (details.latest_version !== undefined) {
      meta.currentVersion = details.latest_version;
    }
    return meta;
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  async listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const res = await this.request<{ keys: string[] }>("keys?list=true");
    const keyNames = res.keys ?? [];
    const list: KmsKeyMetadata[] = [];
    for (const name of keyNames) {
      try {
        const meta = await this.getKey(name);
        if (filters?.usage && meta.usage !== filters.usage) continue;
        if (filters?.enabled !== undefined && meta.enabled !== filters.enabled)
          continue;
        list.push(meta);
      } catch {
        // Skip keys that cannot be read
      }
    }
    return list;
  }

  /** Retrieve metadata for a specific key by ID. */
  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    const details = await this.request<VaultKeyDetails>(
      `keys/${keyId}`,
      "GET",
      undefined,
      keyId,
    );
    return this.mapMetadata(keyId, details);
  }

  /** Resolve internal Vault key type from algorithm and usage. */
  private resolveVaultType(algorithm: string, usage: string): string {
    const lower = algorithm.toLowerCase();
    if (lower.includes("p256") || lower.includes("ecdsa")) return "ecdsa-p256";
    if (lower.includes("rsa-4096")) return "rsa-4096";
    if (lower.includes("rsa")) return "rsa-2048";
    if (lower.includes("chacha")) return "chacha20-poly1305";
    if (lower.includes("ed25519")) return "ed25519";
    if (usage === "sign") return "ed25519";
    return "aes256-gcm96";
  }

  /** Create a new key with the given algorithm and usage. */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keyId =
      metadata?.["keyId"] ??
      `vault-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const vaultType = this.resolveVaultType(algorithm, usage);
    await this.request(`keys/${keyId}`, "POST", { type: vaultType }, keyId);
    return this.getKey(keyId);
  }

  /** Enable a previously disabled key. */
  async enableKey(keyId: string): Promise<void> {
    await this.request(
      `keys/${keyId}/config`,
      "POST",
      { min_encryption_version: 0 },
      keyId,
    );
  }

  /** Disable a key so it cannot be used for operations. */
  async disableKey(keyId: string): Promise<void> {
    const meta = await this.getKey(keyId);
    const disableVersion = (meta.currentVersion ?? 1) + 1;
    await this.request(
      `keys/${keyId}/config`,
      "POST",
      { min_encryption_version: disableVersion },
      keyId,
    );
  }

  /** Schedule a key for deletion after a pending window. */
  async scheduleKeyDeletion(
    keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    await this.request(
      `keys/${keyId}/config`,
      "POST",
      { deletion_allowed: true },
      keyId,
    );
    await this.request(`keys/${keyId}`, "DELETE", undefined, keyId);
  }

  /** Encrypt plaintext using a managed key. */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const b64Plaintext = Buffer.from(plaintext).toString("base64");
    const b64Context = context
      ? Buffer.from(JSON.stringify(context)).toString("base64")
      : undefined;
    const body: Record<string, unknown> = { plaintext: b64Plaintext };
    if (b64Context) body.context = b64Context;

    const res = await this.request<{ ciphertext: string }>(
      `encrypt/${keyId}`,
      "POST",
      body,
      keyId,
    );
    const out: KmsEncryptResult = {
      ciphertext: res.ciphertext,
      keyId,
    };
    if (context) out.context = context;
    return out;
  }

  /** Decrypt ciphertext using a managed key. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const b64Context = context
      ? Buffer.from(JSON.stringify(context)).toString("base64")
      : undefined;
    const body: Record<string, unknown> = { ciphertext };
    if (b64Context) body.context = b64Context;

    const res = await this.request<{ plaintext: string }>(
      `decrypt/${keyId}`,
      "POST",
      body,
      keyId,
    );
    return {
      plaintext: new Uint8Array(Buffer.from(res.plaintext, "base64")),
      keyId,
    };
  }

  /** Sign data using a managed signing key. */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm = "sha2-256",
  ): Promise<KmsSignResult> {
    const input = Buffer.from(data).toString("base64");
    const res = await this.request<{ signature: string }>(
      `sign/${keyId}`,
      "POST",
      { input, signature_algorithm: algorithm },
      keyId,
    );
    return {
      signature: res.signature,
      keyId,
      algorithm,
    };
  }

  /** Verify a signature against data. */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    algorithm = "sha2-256",
  ): Promise<boolean> {
    const input = Buffer.from(data).toString("base64");
    try {
      const res = await this.request<{ valid?: boolean }>(
        `verify/${keyId}`,
        "POST",
        { input, signature, signature_algorithm: algorithm },
        keyId,
      );
      return Boolean(res.valid);
    } catch {
      return false;
    }
  }

  /** Rotate a key to a new version. */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    await this.request(`keys/${keyId}/rotate`, "POST", undefined, keyId);
    return this.getKey(keyId);
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  async generateDataKey(
    keyId: string,
    keySpec = "AES_256",
  ): Promise<{
    plaintext: Uint8Array;
    ciphertext: string;
  }> {
    const bits = keySpec.includes("128") ? 128 : 256;
    const res = await this.request<{ plaintext: string; ciphertext: string }>(
      `datakey/plaintext/${keyId}`,
      "POST",
      { bits },
      keyId,
    );
    return {
      plaintext: new Uint8Array(Buffer.from(res.plaintext, "base64")),
      ciphertext: res.ciphertext,
    };
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
