/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file TypeScript SDK for the Crypto Service Suite v2 API.
 *
 * Zero-dependency, fetch-based typed client for all cryptographic operations.
 *
 * @example
 * ```ts
 * import { CryptoClient } from '@sebastienrousseau/crypto-sdk';
 *
 * const client = new CryptoClient({ baseUrl: 'http://localhost:3000' });
 * const { data } = await client.hash({ algorithm: 'sha256', data: 'hello' });
 * console.log(data.digest);
 * ```
 */

export interface ClientOptions {
  /** Base URL of the crypto server (e.g., "http://localhost:3000"). */
  baseUrl: string;
  /** API key for x-api-key header authentication. */
  apiKey?: string;
  /** JWT Bearer token for Authorization header. */
  token?: string;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof globalThis.fetch;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

// --- Response types ---

export interface HashResult {
  digest: string;
  algorithm: string;
  length: number;
}

export interface AeadResult {
  ciphertext: string;
  algorithm: string;
}

export interface KdfResult {
  derivedKey: string;
  salt: string;
  algorithm: string;
  keyLength: number;
}

export interface Ed25519KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface SignResult {
  signature: string;
  algorithm: string;
}

export interface VerifyResult {
  valid: boolean;
  algorithm: string;
}

export interface HybridKeyPair {
  x25519PrivateKey: string;
  x25519PublicKey: string;
  mlKemPublicKey: string;
  mlKemSecretKey: string;
  algorithm: string;
}

export interface HybridEncapsulateResult {
  x25519EphemeralPublic: string;
  mlKemCiphertext: string;
  sharedSecret: string;
  algorithm: string;
}

export class CryptoClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetchFn: typeof globalThis.fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.headers = { "Content-Type": "application/json" };

    if (options.apiKey) {
      this.headers["x-api-key"] = options.apiKey;
    }
    if (options.token) {
      this.headers["Authorization"] = `Bearer ${options.token}`;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new CryptoApiError(res.status, json as ApiError);
    }
    return json as ApiResponse<T>;
  }

  // --- Encryption ---

  async encrypt(params: {
    key: string;
    plaintext: string;
  }): Promise<ApiResponse<AeadResult>> {
    return this.request("POST", "/v2/encrypt", params);
  }

  async decrypt(params: {
    key: string;
    ciphertext: string;
  }): Promise<ApiResponse<{ plaintext: string }>> {
    return this.request("POST", "/v2/decrypt", params);
  }

  // --- Hashing ---

  async hash(params: {
    algorithm: string;
    data: string;
  }): Promise<ApiResponse<HashResult>> {
    return this.request("POST", "/v2/hash", params);
  }

  // --- KDF ---

  async kdf(params: {
    algorithm: string;
    password: string;
    salt?: string;
    keyLength?: number;
    params?: Record<string, unknown>;
  }): Promise<ApiResponse<KdfResult>> {
    return this.request("POST", "/v2/kdf", params);
  }

  // --- Signing ---

  async generateKeyPair(): Promise<ApiResponse<Ed25519KeyPair>> {
    return this.request("POST", "/v2/keys/generate", { algorithm: "ed25519" });
  }

  async sign(params: {
    privateKey: string;
    message: string;
  }): Promise<ApiResponse<SignResult>> {
    return this.request("POST", "/v2/sign", params);
  }

  async verify(params: {
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<VerifyResult>> {
    return this.request("POST", "/v2/verify", params);
  }

  // --- Post-Quantum ---

  async pqGenerateKeyPair(): Promise<ApiResponse<HybridKeyPair>> {
    return this.request("POST", "/v2/pq/hybrid/keygen", {});
  }

  async pqEncapsulate(params: {
    x25519PublicKey: string;
    mlKemPublicKey: string;
  }): Promise<ApiResponse<HybridEncapsulateResult>> {
    return this.request("POST", "/v2/pq/hybrid/encapsulate", params);
  }

  async pqDecapsulate(params: {
    x25519PrivateKey: string;
    mlKemSecretKey: string;
    x25519EphemeralPublic: string;
    mlKemCiphertext: string;
  }): Promise<ApiResponse<{ sharedSecret: string; algorithm: string }>> {
    return this.request("POST", "/v2/pq/hybrid/decapsulate", params);
  }

  // --- Utility ---

  async algorithms(): Promise<ApiResponse<Record<string, string[]>>> {
    return this.request("GET", "/v2/algorithms");
  }

  async health(): Promise<{ statusCode: number }> {
    const res = await this.fetchFn(`${this.baseUrl}/health`);
    return res.json();
  }
}

export class CryptoApiError extends Error {
  public readonly status: number;
  public readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(`API Error ${status}: ${body.error}`);
    this.name = "CryptoApiError";
    this.status = status;
    this.body = body;
  }
}
