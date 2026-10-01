/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Typed HTTP client for the Crypto Service Suite v2 API.
 *
 * Private keys never cross the API: key-generation methods return a
 * `keyId` with the public key, and signing, decapsulation and sealed-box
 * opening take that `keyId`. Errors are thrown as {@link CryptoApiError}
 * carrying the server's RFC 9457 problem body.
 *
 * @example
 * ```ts
 * const client = new CryptoClient({ baseUrl: 'http://localhost:3000', apiKey });
 * const { data } = await client.hash({ algorithm: 'sha256', data: 'hello' });
 * console.log(data.digest);
 * ```
 */

import { negotiateAlgorithm } from "./negotiation";
import { CryptoApiError, readProblem } from "./errors";
import type {
  ClientOptions,
  ApiResponse,
  HashAlgorithm,
  HashResult,
  AeadResult,
  KdfAlgorithm,
  KdfResult,
  SecretboxSealResult,
  PasswordEncryptResult,
  KeyWrapAlgorithm,
  KeyWrapResult,
  HealthResult,
  DoraComplianceScorecard,
  CbomExportPayload,
  AlgorithmNegotiationOptions,
  AlgorithmNegotiationResult,
  HmacAlgorithm,
  MacResult,
  MacVerifyResult,
  Argon2Params,
  PasswordHashResult,
} from "./types";
import type {
  KeyAlgorithm,
  KeyIdParams,
  SignParams,
  KeyMetadata,
  KeyGenerateResult,
  KeyExportResult,
  SignResult,
  VerifyResult,
  MlKemKeyPair,
  MlKemEncapsulateResult,
  KemDecapsulateResult,
  HybridKeyPair,
  HybridEncapsulateResult,
  MlDsaLevel,
  MlDsaKeyPair,
  MlDsaSignResult,
  MlDsaVerifyResult,
  SlhDsaVariant,
  SlhDsaKeyPair,
  SlhDsaSignResult,
  SlhDsaVerifyResult,
  SealedboxSealResult,
} from "./key-types";

export * from "./types";
export * from "./key-types";
export { CryptoApiError } from "./errors";

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

  /** Send a request and return the parsed JSON body; throws on a non-OK status. */
  private async send<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body) {
      init.body = JSON.stringify(body);
    }
    const res = await this.fetchFn(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      throw new CryptoApiError(res.status, await readProblem(res));
    }
    return (await res.json()) as T;
  }

  /** Send a request to a route that wraps its result in `{ data }`. */
  private request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    return this.send<ApiResponse<T>>(method, path, body);
  }

  // --- Encryption ---

  /** Encrypt plaintext with XChaCha20-Poly1305 under a 256-bit hex key. */
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
    algorithm: HashAlgorithm;
    data: string;
  }): Promise<ApiResponse<HashResult>> {
    return this.request("POST", "/v2/hash", params);
  }

  // --- KDF ---

  /**
   * Derive a key from a password using a KDF algorithm. The server
   * enforces OWASP floors: scrypt N = 2^17 with r = 8, PBKDF2 at least
   * 600,000 iterations.
   */
  async kdf(params: {
    algorithm: KdfAlgorithm;
    password: string;
    salt?: string;
    /** Derived key length in bytes (16 to 64). */
    keyLength?: number;
    params?: {
      /** scrypt cost (only 131072 is accepted). */
      N?: number;
      /** scrypt block size (only 8 is accepted). */
      r?: number;
      /** scrypt parallelism (1 to 4). */
      p?: number;
      /** PBKDF2 iterations (600,000 to 1,000,000). */
      iterations?: number;
      /** HKDF info string. */
      info?: string;
    };
  }): Promise<ApiResponse<KdfResult>> {
    return this.request("POST", "/v2/kdf", params);
  }

  // --- MAC ---

  /** Compute an HMAC with a hex key. */
  async mac(params: {
    algorithm: HmacAlgorithm;
    key: string;
    data: string;
  }): Promise<ApiResponse<MacResult>> {
    return this.request("POST", "/v2/hmac", params);
  }

  /** Verify an HMAC. */
  async macVerify(params: {
    algorithm: HmacAlgorithm;
    key: string;
    data: string;
    mac: string;
  }): Promise<ApiResponse<MacVerifyResult>> {
    return this.request("POST", "/v2/hmac/verify", params);
  }

  // --- Password Hashing ---

  /**
   * Hash a password with Argon2id. The server requires at least two
   * passes and 19456 KiB of memory.
   */
  async passwordHash(params: {
    password: string;
    timeCost?: number;
    memoryCost?: number;
    parallelism?: number;
  }): Promise<ApiResponse<PasswordHashResult>> {
    return this.request("POST", "/v2/password/hash", params);
  }

  /** Verify a password against a stored Argon2id hash. */
  async passwordVerify(params: {
    password: string;
    hash: string;
    salt: string;
    params: Argon2Params;
  }): Promise<
    ApiResponse<{
      /** Whether the password matches the hash. */
      valid: boolean;
    }>
  > {
    return this.request("POST", "/v2/password/verify", params);
  }

  // --- Key Management ---

  /**
   * Generate a server-held key pair. Returns its `keyId` and public key;
   * the private key stays on the server.
   */
  async generateKeyPair(params?: {
    algorithm?: KeyAlgorithm;
    metadata?: KeyMetadata;
  }): Promise<ApiResponse<KeyGenerateResult>> {
    return this.request(
      "POST",
      "/v2/keys/generate",
      params ?? { algorithm: "ed25519" },
    );
  }

  /**
   * Export a server-held key, private parts included. Needs the
   * `crypto:keys:export` scope, which `crypto:admin` does not imply.
   */
  async exportKey(params: KeyIdParams): Promise<ApiResponse<KeyExportResult>> {
    return this.request("POST", "/v2/keys/export", params);
  }

  // --- Signing ---

  /** Sign a message with a server-held Ed25519 key. */
  async sign(params: SignParams): Promise<ApiResponse<SignResult>> {
    return this.request("POST", "/v2/sign", params);
  }

  /** Verify an Ed25519 signature against a public key. */
  async verify(params: {
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<VerifyResult>> {
    return this.request("POST", "/v2/verify", params);
  }

  // --- Post-Quantum KEM ---

  /** Generate a server-held ML-KEM-768 key pair. */
  async mlKemGenerateKeyPair(): Promise<ApiResponse<MlKemKeyPair>> {
    return this.request("POST", "/v2/pq/keygen", {});
  }

  /** Encapsulate a shared secret to an ML-KEM-768 public key. */
  async mlKemEncapsulate(params: {
    publicKey: string;
  }): Promise<ApiResponse<MlKemEncapsulateResult>> {
    return this.request("POST", "/v2/pq/encapsulate", params);
  }

  /** Recover an ML-KEM-768 shared secret with a server-held key. */
  async mlKemDecapsulate(
    params: KeyIdParams & { ciphertext: string },
  ): Promise<ApiResponse<KemDecapsulateResult>> {
    return this.request("POST", "/v2/pq/decapsulate", params);
  }

  /** Generate a server-held hybrid X25519 + ML-KEM-768 key pair. */
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

  /** Recover a hybrid KEM shared secret with a server-held key. */
  async pqDecapsulate(
    params: KeyIdParams & {
      x25519EphemeralPublic: string;
      mlKemCiphertext: string;
    },
  ): Promise<ApiResponse<KemDecapsulateResult>> {
    return this.request("POST", "/v2/pq/hybrid/decapsulate", params);
  }

  // --- Post-Quantum Signatures (ML-DSA) ---

  /** Sign with a server-held ML-DSA key (FIPS 204); the level comes from the key. */
  async pqSign(params: SignParams): Promise<ApiResponse<MlDsaSignResult>> {
    return this.request("POST", "/v2/pq/dsa/sign", params);
  }

  /** Verify an ML-DSA signature. */
  async pqVerify(params: {
    level: MlDsaLevel;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<MlDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/dsa/verify", params);
  }

  /** Generate a server-held ML-DSA key pair. */
  async pqSignKeygen(params: {
    level: MlDsaLevel;
  }): Promise<ApiResponse<MlDsaKeyPair>> {
    return this.request("POST", "/v2/pq/dsa/keygen", params);
  }

  // --- Post-Quantum Hash-Based Signatures (SLH-DSA) ---

  /** Sign with a server-held SLH-DSA key (FIPS 205); the variant comes from the key. */
  async pqHashSign(params: SignParams): Promise<ApiResponse<SlhDsaSignResult>> {
    return this.request("POST", "/v2/pq/slh-dsa/sign", params);
  }

  /** Verify an SLH-DSA signature. */
  async pqHashVerify(params: {
    variant: SlhDsaVariant;
    publicKey: string;
    message: string;
    signature: string;
  }): Promise<ApiResponse<SlhDsaVerifyResult>> {
    return this.request("POST", "/v2/pq/slh-dsa/verify", params);
  }

  /** Generate a server-held SLH-DSA key pair. */
  async pqHashSignKeygen(params: {
    variant: SlhDsaVariant;
  }): Promise<ApiResponse<SlhDsaKeyPair>> {
    return this.request("POST", "/v2/pq/slh-dsa/keygen", params);
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

  /** Open a secretbox; `data` is the recovered plaintext. */
  async secretboxOpen(params: {
    key: string;
    ciphertext: string;
    aad?: string;
  }): Promise<ApiResponse<string>> {
    return this.request("POST", "/v2/secretbox/open", params);
  }

  // --- High-Level: Sealed Box ---

  /** Seal plaintext to an X25519 public key (anonymous sender). */
  async sealedboxSeal(params: {
    recipientPublicKey: string;
    plaintext: string;
  }): Promise<ApiResponse<SealedboxSealResult>> {
    return this.request("POST", "/v2/sealedbox/seal", params);
  }

  /** Open a sealed box with a server-held x25519 key; `data` is the plaintext. */
  async sealedboxOpen(
    params: KeyIdParams & { sealed: string },
  ): Promise<ApiResponse<string>> {
    return this.request("POST", "/v2/sealedbox/open", params);
  }

  /** Seal plaintext to a hybrid X25519 + ML-KEM-768 public key pair. */
  async sealedboxSealPq(params: {
    x25519PublicKey: string;
    mlKemPublicKey: string;
    plaintext: string;
  }): Promise<ApiResponse<SealedboxSealResult>> {
    return this.request("POST", "/v2/sealedbox/seal-pq", params);
  }

  /** Open a hybrid sealed box with a server-held hybrid key; `data` is the plaintext. */
  async sealedboxOpenPq(
    params: KeyIdParams & { sealed: string },
  ): Promise<ApiResponse<string>> {
    return this.request("POST", "/v2/sealedbox/open-pq", params);
  }

  // --- High-Level: Password Encryption ---

  /** Encrypt plaintext with a password (Argon2id + XChaCha20-Poly1305). */
  async passwordEncrypt(params: {
    password: string;
    plaintext: string;
  }): Promise<ApiResponse<PasswordEncryptResult>> {
    return this.request("POST", "/v2/password/encrypt", params);
  }

  /**
   * Decrypt a payload from `passwordEncrypt` (its `encrypted` field);
   * `data` is the plaintext.
   */
  async passwordDecrypt(params: {
    password: string;
    ciphertext: string;
  }): Promise<ApiResponse<string>> {
    return this.request("POST", "/v2/password/decrypt", params);
  }

  // --- High-Level: Key Wrapping ---

  /** Wrap (encrypt) a key with a key-encryption key. */
  async keyWrap(params: {
    kek: string;
    keyToWrap: string;
    algorithm?: KeyWrapAlgorithm;
  }): Promise<ApiResponse<KeyWrapResult>> {
    return this.request("POST", "/v2/keys/wrap", params);
  }

  /** Unwrap a wrapped key; `data` is the hex-encoded key. */
  async keyUnwrap(params: {
    kek: string;
    wrappedKey: string;
    algorithm?: KeyWrapAlgorithm;
  }): Promise<ApiResponse<string>> {
    return this.request("POST", "/v2/keys/unwrap", params);
  }

  // --- Compliance & Regulatory Endpoints ---

  /** Fetch the DORA Article 9 & 13 self-assessment. */
  async getDoraCompliance(): Promise<ApiResponse<DoraComplianceScorecard>> {
    return this.request("GET", "/v2/compliance/dora");
  }

  /**
   * Fetch the CycloneDX 1.6 Cryptographic Bill of Materials (CBOM). The
   * route returns the CycloneDX document itself, not wrapped in `{ data }`.
   */
  async getCbom(): Promise<CbomExportPayload> {
    return this.send("GET", "/v2/compliance/cbom");
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

  /** Check API server health (a public route: no credentials are sent). */
  async health(): Promise<HealthResult> {
    const res = await this.fetchFn(`${this.baseUrl}/health`);
    return res.json() as Promise<HealthResult>;
  }
}
