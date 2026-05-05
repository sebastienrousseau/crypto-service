/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
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

export interface MlDsaKeyPair {
  publicKey: string;
  secretKey: string;
  algorithm: string;
}

export interface MlDsaSignResult {
  signature: string;
  algorithm: string;
}

export interface MlDsaVerifyResult {
  valid: boolean;
  algorithm: string;
}

export interface SlhDsaKeyPair {
  publicKey: string;
  secretKey: string;
  algorithm: string;
}

export interface SlhDsaSignResult {
  signature: string;
  algorithm: string;
}

export interface SlhDsaVerifyResult {
  valid: boolean;
  algorithm: string;
}

export interface SecretboxSealResult {
  sealed: string;
}

export interface SealedboxSealResult {
  sealed: string;
  ephemeralPublicKey: string;
}

export interface PasswordEncryptResult {
  ciphertext: string;
}

export interface KeyWrapResult {
  wrappedKey: string;
}

export interface KeyGenerateResult {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  kid: string;
}

export interface MacResult {
  mac: string;
  algorithm: string;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  params: { t: number; m: number; p: number };
  algorithm: string;
  phc: string;
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

  // --- MAC ---

  async mac(params: {
    algorithm: string;
    key: string;
    data: string;
  }): Promise<ApiResponse<MacResult>> {
    return this.request("POST", "/v2/mac/compute", params);
  }

  async macVerify(params: {
    algorithm: string;
    key: string;
    data: string;
    mac: string;
  }): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request("POST", "/v2/mac/verify", params);
  }

  // --- Password Hashing ---

  async passwordHash(params: {
    password: string;
    variant?: string;
    timeCost?: number;
    memoryCost?: number;
    parallelism?: number;
  }): Promise<ApiResponse<PasswordHashResult>> {
    return this.request("POST", "/v2/password/hash", params);
  }

  async passwordVerify(params: {
    password: string;
    hash: string;
    salt: string;
    params: { t: number; m: number; p: number };
    variant?: string;
  }): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request("POST", "/v2/password/verify", params);
  }

  // --- Signing ---

  async generateKeyPair(params?: {
    algorithm?: string;
    metadata?: Record<string, string>;
  }): Promise<ApiResponse<KeyGenerateResult>> {
    return this.request(
      "POST",
      "/v2/keys/generate",
      params ?? { algorithm: "ed25519" },
    );
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

  // --- Post-Quantum KEM ---

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

  // --- Post-Quantum Signatures (ML-DSA) ---

  async pqSign(params: {
    level: 44 | 65 | 87;
    secretKey: string;
    message: string;
  }): Promise<ApiResponse<MlDsaSignResult>> {
    return this.request("POST", "/v2/pq/dsa/sign", params);
  }

  async pqVerify(params: {
    level: 44 | 65 | 87;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<MlDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/dsa/verify", params);
  }

  async pqSignKeygen(params: {
    level: 44 | 65 | 87;
  }): Promise<ApiResponse<MlDsaKeyPair>> {
    return this.request("POST", "/v2/pq/dsa/keygen", params);
  }

  // --- Post-Quantum Hash-Based Signatures (SLH-DSA) ---

  async pqHashSign(params: {
    variant: string;
    secretKey: string;
    message: string;
  }): Promise<ApiResponse<SlhDsaSignResult>> {
    return this.request("POST", "/v2/pq/hash-sign/sign", params);
  }

  async pqHashVerify(params: {
    variant: string;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<SlhDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/hash-sign/verify", params);
  }

  async pqHashSignKeygen(params: {
    variant: string;
  }): Promise<ApiResponse<SlhDsaKeyPair>> {
    return this.request("POST", "/v2/pq/hash-sign/keygen", params);
  }

  // --- High-Level: Secretbox ---

  async secretboxSeal(params: {
    key: string;
    plaintext: string;
    aad?: string;
  }): Promise<ApiResponse<SecretboxSealResult>> {
    return this.request("POST", "/v2/secretbox/seal", params);
  }

  async secretboxOpen(params: {
    key: string;
    ciphertext: string;
    aad?: string;
  }): Promise<ApiResponse<{ plaintext: string }>> {
    return this.request("POST", "/v2/secretbox/open", params);
  }

  // --- High-Level: Sealed Box ---

  async sealedboxSeal(params: {
    recipientPublicKey: string;
    plaintext: string;
  }): Promise<ApiResponse<SealedboxSealResult>> {
    return this.request("POST", "/v2/sealedbox/seal", params);
  }

  async sealedboxOpen(params: {
    recipientSecretKey: string;
    sealed: string;
  }): Promise<ApiResponse<{ plaintext: string }>> {
    return this.request("POST", "/v2/sealedbox/open", params);
  }

  // --- High-Level: Password Encryption ---

  async passwordEncrypt(params: {
    password: string;
    plaintext: string;
  }): Promise<ApiResponse<PasswordEncryptResult>> {
    return this.request("POST", "/v2/password/encrypt", params);
  }

  async passwordDecrypt(params: {
    password: string;
    ciphertext: string;
  }): Promise<ApiResponse<{ plaintext: string }>> {
    return this.request("POST", "/v2/password/decrypt", params);
  }

  // --- High-Level: Key Wrapping ---

  async keyWrap(params: {
    kek: string;
    keyToWrap: string;
    algorithm?: "aes-kw" | "aes-kwp";
  }): Promise<ApiResponse<KeyWrapResult>> {
    return this.request("POST", "/v2/keys/wrap", params);
  }

  async keyUnwrap(params: {
    kek: string;
    wrappedKey: string;
    algorithm?: "aes-kw" | "aes-kwp";
  }): Promise<ApiResponse<{ key: string }>> {
    return this.request("POST", "/v2/keys/unwrap", params);
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
