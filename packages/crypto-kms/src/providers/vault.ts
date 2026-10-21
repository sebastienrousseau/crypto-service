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
import { canonicalContext } from "./versioned-key";

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
  /**
   * Also accept ciphertext written by crypto-kms 0.0.35 and earlier, which
   * passed the encryption context as Transit's `context` parameter. Vault
   * ignores that parameter for keys that are not derived, so those
   * ciphertexts were never bound to their context. When set, a decryption
   * that fails with the context is retried without it. Re-encrypt such
   * data and turn this off; default false.
   */
  acceptUnboundContext?: boolean;
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
    /ciphertext.*invalid|decryption failed|authentication failed/i.test(errMsg)
  ) {
    throw new KmsError("DECRYPTION_FAILED", errMsg, keyId);
  }
  // Transit answers 400 "signing key not found" (and similar) for sign
  // and verify against a key that does not exist.
  if (/key not found/i.test(errMsg)) {
    throw new KmsError("NOT_FOUND", errMsg, keyId);
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
  /** See {@link VaultKmsOptions.acceptUnboundContext}. */
  private readonly _acceptUnboundContext: boolean;

  /** Create a Vault Transit provider with the given options. */
  constructor(options: VaultKmsOptions) {
    this._address = options.address;
    this._token = options.token;
    this._mount = options.mountPath ?? "transit";
    this._namespace = options.namespace;
    this._acceptUnboundContext = options.acceptUnboundContext ?? false;
  }

  /** Build a Vault API URL for the transit engine. */
  buildUrl(path: string): string {
    if (!/^[a-zA-Z0-9_\-/:.?=&]+$/.test(path) || path.includes("..")) {
      throw new KmsError("INVALID_ARGUMENT", "Invalid Vault path", path);
    }
    const address =
      this._address.startsWith("http://") ||
      this._address.startsWith("https://")
        ? this._address
        : `http://${this._address}`;
    const cleanMount = encodeURIComponent(this._mount);
    const base = `${address.replace(/\/+$/, "")}/v1/${cleanMount}/`;
    return new URL(path, base).href;
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

  /**
   * Not supported: Vault Transit has no way to disable a key (the minimum
   * encryption version cannot exceed the latest version). Restrict use of
   * the key with a Vault policy instead.
   */
  async enableKey(keyId: string): Promise<void> {
    throw new KmsError(
      "NOT_IMPLEMENTED",
      "Vault Transit keys cannot be enabled or disabled; use a Vault policy",
      keyId,
    );
  }

  /** Not supported; see {@link VaultKmsProvider.enableKey}. */
  async disableKey(keyId: string): Promise<void> {
    return this.enableKey(keyId);
  }

  /**
   * Delete a key. Vault Transit has no deletion window: the key and every
   * version are destroyed at once, and data encrypted under it is lost.
   * Pass `pendingWindowDays: 0` to confirm; any other value, including
   * none, is refused so a caller expecting a window cannot lose the key.
   */
  async scheduleKeyDeletion(
    keyId: string,
    pendingWindowDays?: number,
  ): Promise<void> {
    if (pendingWindowDays !== 0) {
      throw new KmsError(
        "INVALID_ARGUMENT",
        "Vault Transit deletes keys immediately; pass pendingWindowDays 0 to confirm",
        keyId,
      );
    }
    await this.request(
      `keys/${keyId}/config`,
      "POST",
      { deletion_allowed: true },
      keyId,
    );
    await this.request(`keys/${keyId}`, "DELETE", undefined, keyId);
  }

  /**
   * The encryption context as Transit `associated_data`: authenticated
   * with the ciphertext, independent of key order. Transit's `context`
   * parameter is only for derived keys and is ignored otherwise.
   */
  private aad(context?: Record<string, string>): Record<string, string> {
    const bytes = canonicalContext(context);
    return bytes.length > 0
      ? { associated_data: bytes.toString("base64") }
      : {};
  }

  /** Encrypt plaintext, binding the encryption context. */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const res = await this.request<{ ciphertext: string }>(
      `encrypt/${keyId}`,
      "POST",
      {
        plaintext: Buffer.from(plaintext).toString("base64"),
        ...this.aad(context),
      },
      keyId,
    );
    const out: KmsEncryptResult = { ciphertext: res.ciphertext, keyId };
    if (context) out.context = context;
    return out;
  }

  /** Decrypt ciphertext; the encryption context must match. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const aad = this.aad(context);
    try {
      return await this.decryptWith(keyId, ciphertext, aad);
    } catch (err) {
      const retry =
        this._acceptUnboundContext &&
        "associated_data" in aad &&
        err instanceof KmsError &&
        err.code === "DECRYPTION_FAILED";
      if (!retry) throw err;
      return this.decryptWith(keyId, ciphertext, {});
    }
  }

  private async decryptWith(
    keyId: string,
    ciphertext: string,
    aad: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const res = await this.request<{ plaintext: string }>(
      `decrypt/${keyId}`,
      "POST",
      { ciphertext, ...aad },
      keyId,
    );
    return {
      plaintext: new Uint8Array(Buffer.from(res.plaintext, "base64")),
      keyId,
    };
  }

  /**
   * Sign data. `algorithm` is the Transit hash algorithm (default
   * "sha2-256"); RSA keys use Transit's default PSS padding, and Ed25519
   * ignores the hash.
   */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm = "sha2-256",
  ): Promise<KmsSignResult> {
    const res = await this.request<{ signature: string }>(
      `sign/${keyId}`,
      "POST",
      {
        input: Buffer.from(data).toString("base64"),
        hash_algorithm: algorithm,
      },
      keyId,
    );
    return { signature: res.signature, keyId, algorithm };
  }

  /**
   * Verify a signature. A wrong or malformed signature returns false;
   * lookup, permission and transport errors are thrown.
   */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    algorithm = "sha2-256",
  ): Promise<boolean> {
    try {
      const res = await this.request<{ valid?: boolean }>(
        `verify/${keyId}`,
        "POST",
        {
          input: Buffer.from(data).toString("base64"),
          signature,
          hash_algorithm: algorithm,
        },
        keyId,
      );
      return res.valid === true;
    } catch (err) {
      if (err instanceof KmsError && /invalid signature/i.test(err.message)) {
        return false;
      }
      throw err;
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
