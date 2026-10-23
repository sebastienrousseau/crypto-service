// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks Google Cloud KMS adapter using native Cloud KMS REST v1 API. */

import * as nodeCrypto from "node:crypto";
import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import { KmsError } from "../errors";
import { GCP_ALGORITHMS, resolveAlgorithm } from "./algorithms";

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
  /**
   * The current version. Cloud KMS sets it for symmetric keys only;
   * asymmetric keys have numbered versions and no primary.
   */
  primary?: {
    name?: string;
    state?: string;
    algorithm?: string;
    createTime?: string;
  };
  /** Algorithm new versions are created with. */
  versionTemplate?: { algorithm?: string };
}

/**
 * Raw GCP CryptoKeyVersion resource. Cloud KMS always returns these
 * fields; a missing state matches no state filter and a missing algorithm
 * is refused by verifyParams.
 */
interface RawGcpVersion {
  name: string;
  state: string;
  algorithm: string;
}

/** How to check a signature locally for a Cloud KMS signing algorithm. */
interface VerifyParams {
  /** Digest the key version signs, or null when it signs the message. */
  digest: "sha256" | "sha384" | "sha512" | null;
  /** RSA padding, when the algorithm is RSA. */
  padding?: number;
}

/**
 * Local verification parameters per Cloud KMS signing algorithm. Cloud KMS
 * has no remote verify for asymmetric keys: callers verify against the
 * version's public key. RSA-PSS uses a salt as long as the digest.
 */
function verifyParams(algorithm: string): VerifyParams {
  const digest = /SHA512$/.test(algorithm)
    ? "sha512"
    : /SHA384$/.test(algorithm)
      ? "sha384"
      : "sha256";
  if (algorithm === "EC_SIGN_ED25519") return { digest: null };
  if (/^EC_SIGN_/.test(algorithm)) return { digest };
  if (/^RSA_SIGN_PSS_/.test(algorithm)) {
    return { digest, padding: nodeCrypto.constants.RSA_PKCS1_PSS_PADDING };
  }
  if (/^RSA_SIGN_PKCS1_/.test(algorithm)) {
    return { digest, padding: nodeCrypto.constants.RSA_PKCS1_PADDING };
  }
  throw new KmsError(
    "INVALID_ARGUMENT",
    `GCP signing algorithm ${algorithm} is not supported`,
  );
}

/** Version number at the end of a version resource name. */
const versionNumber = (v: RawGcpVersion): number =>
  Number(v.name.slice(v.name.lastIndexOf("/") + 1));

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

/** Extract short key identifier from GCP resource name. */
function extractGcpKeyId(fullName?: string): string {
  if (!fullName) return "";
  const idx = fullName.lastIndexOf("/");
  return idx >= 0 ? fullName.slice(idx + 1) : fullName;
}

/**
 * A key's algorithm: its primary version's for a symmetric key, its
 * version template's for an asymmetric key (which has no primary).
 */
function keyAlgorithm(raw: RawGcpKey): string {
  return (
    raw.primary?.algorithm ??
    raw.versionTemplate?.algorithm ??
    "GOOGLE_SYMMETRIC_ENCRYPTION"
  );
}

/** Convert raw GCP CryptoKey to KmsKeyMetadata. */
function mapGcpKey(raw: RawGcpKey, fallbackId: string): KmsKeyMetadata {
  const keyId = extractGcpKeyId(raw.name) || fallbackId;
  const isSign = raw.purpose === "ASYMMETRIC_SIGN";
  return {
    keyId,
    algorithm: keyAlgorithm(raw),
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

  /**
   * Build a sanitized GCP Cloud KMS API URL. The path is checked against a
   * strict character set; query values (such as page tokens) are encoded
   * separately so they never reach the path.
   */
  private buildUrl(path: string, query?: Record<string, string>): string {
    if (!/^[a-zA-Z0-9_\-/:.?=&]+$/.test(path) || path.includes("..")) {
      throw new KmsError("INVALID_ARGUMENT", "Invalid GCP KMS path", path);
    }
    const endpoint =
      this.options.endpoint ?? "https://cloudkms.googleapis.com/v1";
    const base = `${endpoint.replace(/\/+$/, "")}/`;
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(query ?? {})) {
      url.searchParams.set(k, v);
    }
    return url.href;
  }

  /** Send authenticated request to GCP Cloud KMS API. */
  private async request<T>(
    path: string,
    method = "GET",
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);
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
        algorithm: resolveAlgorithm(
          "GcpKmsProvider",
          GCP_ALGORITHMS,
          algorithm,
          usage,
        ),
      },
      ...(metadata ? { labels: metadata } : {}),
    };
    const res = await this.request<RawGcpKey>(path, "POST", body);
    return mapGcpKey(res, keyId);
  }

  /** Every version of a key, following list pages. */
  private async listVersions(keyId: string): Promise<RawGcpVersion[]> {
    const path = `${this.getKeyName(keyId)}/cryptoKeyVersions`;
    const versions: RawGcpVersion[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.request<{
        cryptoKeyVersions?: RawGcpVersion[];
        nextPageToken?: string;
      }>(path, "GET", undefined, pageToken ? { pageToken } : undefined);
      versions.push(...(res.cryptoKeyVersions ?? []));
      pageToken = res.nextPageToken;
    } while (pageToken);
    return versions;
  }

  /** Versions of a key in one of `states`. */
  private async versionsIn(
    keyId: string,
    states: string[],
  ): Promise<RawGcpVersion[]> {
    const all = await this.listVersions(keyId);
    return all.filter((v) => states.includes(v.state));
  }

  /** Set the state of every version currently in `from`. */
  private async setVersionStates(
    keyId: string,
    from: string,
    to: string,
  ): Promise<void> {
    for (const v of await this.versionsIn(keyId, [from])) {
      await this.request(`${v.name}?updateMask=state`, "PATCH", { state: to });
    }
  }

  /** Enable every disabled version of a key. */
  async enableKey(keyId: string): Promise<void> {
    await this.setVersionStates(keyId, "DISABLED", "ENABLED");
  }

  /** Disable every enabled version of a key. */
  async disableKey(keyId: string): Promise<void> {
    await this.setVersionStates(keyId, "ENABLED", "DISABLED");
  }

  /**
   * Schedule every version that is not already scheduled or destroyed
   * for destruction. Cloud KMS applies the key's own
   * `destroyScheduledDuration`, set when the key is created, so
   * `pendingWindowDays` is not used.
   */
  async scheduleKeyDeletion(
    keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    for (const v of await this.versionsIn(keyId, ["ENABLED", "DISABLED"])) {
      await this.request(`${v.name}:destroy`, "POST", {});
    }
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

  /**
   * Sign data with the newest enabled version of a signing key. Digest
   * algorithms receive the message's digest, Ed25519 the message itself.
   * The result reports the version's actual algorithm.
   */
  async sign(
    keyId: string,
    data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    const enabled = await this.versionsIn(keyId, ["ENABLED"]);
    const version = enabled.sort(
      (a, b) => versionNumber(b) - versionNumber(a),
    )[0];
    if (!version) {
      throw new KmsError("DISABLED", "Key has no enabled version", keyId);
    }
    const algorithm = version.algorithm;
    const { digest } = verifyParams(algorithm);
    const body = digest
      ? {
          digest: {
            [digest]: nodeCrypto
              .createHash(digest)
              .update(data)
              .digest("base64"),
          },
        }
      : { data: Buffer.from(data).toString("base64") };
    const res = await this.request<{ signature: string }>(
      `${version.name}:asymmetricSign`,
      "POST",
      body,
    );
    return { signature: res.signature, keyId, algorithm };
  }

  /**
   * Verify a signature locally against the public key of every enabled
   * version, so signatures made before a rotation still verify until
   * their version is disabled or destroyed. Cloud KMS has no remote
   * verify for asymmetric keys. A mismatch returns false; transport and
   * lookup errors are thrown.
   */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    const sig = Buffer.from(signature, "base64");
    for (const v of await this.versionsIn(keyId, ["ENABLED"])) {
      const res = await this.request<{ pem: string; algorithm: string }>(
        `${v.name}/publicKey`,
      );
      const { digest, padding } = verifyParams(res.algorithm);
      const key = nodeCrypto.createPublicKey(res.pem);
      const ok = nodeCrypto.verify(
        digest,
        data,
        padding === undefined
          ? key
          : {
              key,
              padding,
              saltLength: nodeCrypto.constants.RSA_PSS_SALTLEN_DIGEST,
            },
        sig,
      );
      if (ok) return true;
    }
    return false;
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
