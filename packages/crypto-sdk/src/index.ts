/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Typed HTTP client for the Crypto Service Suite v2 API.
 *
 * @example
 * ```ts
 * const client = new CryptoClient({ baseUrl: 'http://localhost:3000' });
 * const { data } = await client.hash({ algorithm: 'sha256', data: 'hello' });
 * console.log(data.digest);
 * ```
 */

import { negotiateAlgorithm } from "./negotiation";
import type {
  ClientOptions,
  ApiResponse,
  ApiError,
  HashResult,
  AeadResult,
  KdfResult,
  SignResult,
  VerifyResult,
  HybridKeyPair,
  HybridEncapsulateResult,
  MlDsaKeyPair,
  MlDsaSignResult,
  MlDsaVerifyResult,
  SlhDsaKeyPair,
  SlhDsaSignResult,
  SlhDsaVerifyResult,
  SecretboxSealResult,
  SealedboxSealResult,
  PasswordEncryptResult,
  KeyWrapResult,
  KeyGenerateResult,
  DoraComplianceScorecard,
  CbomExportPayload,
  AlgorithmNegotiationOptions,
  AlgorithmNegotiationResult,
  MacResult,
  PasswordHashResult,
} from "./types";

export * from "./types";

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
    const init: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body) {
      init.body = JSON.stringify(body);
    }
    const res = await this.fetchFn(`${this.baseUrl}${path}`, init);

    const json = await res.json();
    if (!res.ok) {
      throw new CryptoApiError(res.status, json as ApiError);
    }
    return json as ApiResponse<T>;
  }

  // --- Encryption ---

  /** Encrypt plaintext using AEAD (AES-GCM or XChaCha20-Poly1305). */
  async encrypt(params: {
    key: string;
    plaintext: string;
  }): Promise<ApiResponse<AeadResult>> {
    return this.request("POST", "/v2/encrypt", params);
  }

  /** Decrypt ciphertext and return the original plaintext. */
  async decrypt(params: { key: string; ciphertext: string }): Promise<
    ApiResponse<{
      /** Recovered plaintext string. */
      plaintext: string;
    }>
  > {
    return this.request("POST", "/v2/decrypt", params);
  }

  // --- Hashing ---

  /** Compute a cryptographic hash digest. */
  async hash(params: {
    algorithm: string;
    data: string;
  }): Promise<ApiResponse<HashResult>> {
    return this.request("POST", "/v2/hash", params);
  }

  // --- KDF ---

  /** Derive a key from a password using a KDF algorithm. */
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

  /** Compute a message authentication code (HMAC or KMAC). */
  async mac(params: {
    algorithm: string;
    key: string;
    data: string;
  }): Promise<ApiResponse<MacResult>> {
    return this.request("POST", "/v2/hmac", params);
  }

  /** Verify a message authentication code. */
  async macVerify(params: {
    algorithm: string;
    key: string;
    data: string;
    mac: string;
  }): Promise<
    ApiResponse<{
      /** Whether the MAC is valid. */
      valid: boolean;
    }>
  > {
    return this.request("POST", "/v2/hmac/verify", params);
  }

  // --- Password Hashing ---

  /** Hash a password using Argon2. */
  async passwordHash(params: {
    password: string;
    variant?: string;
    timeCost?: number;
    memoryCost?: number;
    parallelism?: number;
  }): Promise<ApiResponse<PasswordHashResult>> {
    return this.request("POST", "/v2/password/hash", params);
  }

  /** Verify a password against a stored Argon2 hash. */
  async passwordVerify(params: {
    password: string;
    hash: string;
    salt: string;
    params: { t: number; m: number; p: number };
    variant?: string;
  }): Promise<
    ApiResponse<{
      /** Whether the password matches the hash. */
      valid: boolean;
    }>
  > {
    return this.request("POST", "/v2/password/verify", params);
  }

  // --- Signing ---

  /** Generate a new asymmetric key pair. */
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

  /** Sign a message with a private key. */
  async sign(params: {
    privateKey: string;
    message: string;
  }): Promise<ApiResponse<SignResult>> {
    return this.request("POST", "/v2/sign", params);
  }

  /** Verify a digital signature against a public key. */
  async verify(params: {
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<VerifyResult>> {
    return this.request("POST", "/v2/verify", params);
  }

  // --- Post-Quantum KEM ---

  /** Generate a hybrid X25519+ML-KEM key pair. */
  async pqGenerateKeyPair(): Promise<ApiResponse<HybridKeyPair>> {
    return this.request("POST", "/v2/pq/hybrid/keygen", {});
  }

  /** Encapsulate a shared secret using hybrid KEM. */
  async pqEncapsulate(params: {
    x25519PublicKey: string;
    mlKemPublicKey: string;
  }): Promise<ApiResponse<HybridEncapsulateResult>> {
    return this.request("POST", "/v2/pq/hybrid/encapsulate", params);
  }

  /** Decapsulate a shared secret using hybrid KEM. */
  async pqDecapsulate(params: {
    x25519PrivateKey: string;
    mlKemSecretKey: string;
    x25519EphemeralPublic: string;
    mlKemCiphertext: string;
  }): Promise<
    ApiResponse<{
      /** Hex-encoded shared secret. */
      sharedSecret: string;
      /** Hybrid KEM algorithm identifier. */
      algorithm: string;
    }>
  > {
    return this.request("POST", "/v2/pq/hybrid/decapsulate", params);
  }

  // --- Post-Quantum Signatures (ML-DSA) ---

  /** Sign a message using ML-DSA (FIPS 204). */
  async pqSign(params: {
    level: 44 | 65 | 87;
    secretKey: string;
    message: string;
  }): Promise<ApiResponse<MlDsaSignResult>> {
    return this.request("POST", "/v2/pq/dsa/sign", params);
  }

  /** Verify an ML-DSA signature. */
  async pqVerify(params: {
    level: 44 | 65 | 87;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<MlDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/dsa/verify", params);
  }

  /** Generate an ML-DSA key pair. */
  async pqSignKeygen(params: {
    level: 44 | 65 | 87;
  }): Promise<ApiResponse<MlDsaKeyPair>> {
    return this.request("POST", "/v2/pq/dsa/keygen", params);
  }

  // --- Post-Quantum Hash-Based Signatures (SLH-DSA) ---

  /** Sign a message using SLH-DSA (FIPS 205). */
  async pqHashSign(params: {
    variant: string;
    secretKey: string;
    message: string;
  }): Promise<ApiResponse<SlhDsaSignResult>> {
    return this.request("POST", "/v2/pq/hash-sign/sign", params);
  }

  /** Verify an SLH-DSA signature. */
  async pqHashVerify(params: {
    variant: string;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<SlhDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/hash-sign/verify", params);
  }

  /** Generate an SLH-DSA key pair. */
  async pqHashSignKeygen(params: {
    variant: string;
  }): Promise<ApiResponse<SlhDsaKeyPair>> {
    return this.request("POST", "/v2/pq/hash-sign/keygen", params);
  }

  // --- High-Level: Secretbox ---

  /** Seal plaintext with symmetric authenticated encryption (XChaCha20-Poly1305). */
  async secretboxSeal(params: {
    key: string;
    plaintext: string;
    aad?: string;
  }): Promise<ApiResponse<SecretboxSealResult>> {
    return this.request("POST", "/v2/secretbox/seal", params);
  }

  /** Open a secretbox sealed ciphertext. */
  async secretboxOpen(params: {
    key: string;
    ciphertext: string;
    aad?: string;
  }): Promise<
    ApiResponse<{
      /** Recovered plaintext string. */
      plaintext: string;
    }>
  > {
    return this.request("POST", "/v2/secretbox/open", params);
  }

  // --- High-Level: Sealed Box ---

  /** Seal plaintext with anonymous public-key encryption. */
  async sealedboxSeal(params: {
    recipientPublicKey: string;
    plaintext: string;
  }): Promise<ApiResponse<SealedboxSealResult>> {
    return this.request("POST", "/v2/sealedbox/seal", params);
  }

  /** Open a sealed box ciphertext with the recipient's secret key. */
  async sealedboxOpen(params: {
    recipientSecretKey: string;
    sealed: string;
  }): Promise<
    ApiResponse<{
      /** Recovered plaintext string. */
      plaintext: string;
    }>
  > {
    return this.request("POST", "/v2/sealedbox/open", params);
  }

  // --- High-Level: Password Encryption ---

  /** Encrypt plaintext with a password (Argon2 + AEAD). */
  async passwordEncrypt(params: {
    password: string;
    plaintext: string;
  }): Promise<ApiResponse<PasswordEncryptResult>> {
    return this.request("POST", "/v2/password/encrypt", params);
  }

  /** Decrypt password-encrypted ciphertext. */
  async passwordDecrypt(params: {
    password: string;
    ciphertext: string;
  }): Promise<
    ApiResponse<{
      /** Recovered plaintext string. */
      plaintext: string;
    }>
  > {
    return this.request("POST", "/v2/password/decrypt", params);
  }

  // --- High-Level: Key Wrapping ---

  /** Wrap (encrypt) a key with a key-encryption key. */
  async keyWrap(params: {
    kek: string;
    keyToWrap: string;
    algorithm?: "aes-kw" | "aes-kwp";
  }): Promise<ApiResponse<KeyWrapResult>> {
    return this.request("POST", "/v2/keys/wrap", params);
  }

  /** Unwrap (decrypt) a wrapped key. */
  async keyUnwrap(params: {
    kek: string;
    wrappedKey: string;
    algorithm?: "aes-kw" | "aes-kwp";
  }): Promise<
    ApiResponse<{
      /** Hex-encoded unwrapped key. */
      key: string;
    }>
  > {
    return this.request("POST", "/v2/keys/unwrap", params);
  }

  // --- Compliance & Regulatory Endpoints ---

  /** Fetch automated DORA Article 13 & 9 compliance scorecard. */
  async getDoraCompliance(): Promise<ApiResponse<DoraComplianceScorecard>> {
    return this.request("GET", "/v2/compliance/dora");
  }

  /** Fetch CycloneDX 1.6 Cryptographic Bill of Materials (CBOM). */
  async getCbom(): Promise<ApiResponse<CbomExportPayload>> {
    return this.request("GET", "/v2/compliance/cbom");
  }

  // --- Dynamic Crypto-Agility Engine ---

  /**
   * Evaluates network constraints, MTU limits, and regulatory security levels
   * to negotiate the optimal post-quantum or composite hybrid cryptographic algorithm.
   */
  negotiateAlgorithm(
    options: AlgorithmNegotiationOptions = {},
  ): AlgorithmNegotiationResult {
    return negotiateAlgorithm(options);
  }

  // --- Utility ---

  /** List all supported algorithms by category. */
  async algorithms(): Promise<ApiResponse<Record<string, string[]>>> {
    return this.request("GET", "/v2/algorithms");
  }

  /** Check API server health. */
  async health(): Promise<{
    /** HTTP status code from health endpoint. */
    statusCode: number;
  }> {
    const res = await this.fetchFn(`${this.baseUrl}/health`);
    return res.json() as Promise<{ statusCode: number }>;
  }
}

/**
 * Error thrown when the Crypto API returns a non-OK HTTP response.
 *
 * @example
 * ```ts
 * try {
 *   await client.hash({ algorithm: 'invalid', data: 'x' });
 * } catch (err) {
 *   if (err instanceof CryptoApiError) {
 *     console.error(err.status, err.body.error);
 *   }
 * }
 * ```
 */
export class CryptoApiError extends Error {
  /** HTTP status code returned by the API. */
  public readonly status: number;
  /** Parsed error response body. */
  public readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(`API Error ${status}: ${body.error}`);
    this.name = "CryptoApiError";
    this.status = status;
    this.body = body;
  }
}
