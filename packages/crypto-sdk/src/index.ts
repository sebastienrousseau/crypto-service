/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks TypeScript SDK for the Crypto Service Suite v2 API.
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

/**
 * Successful API response wrapper.
 *
 * @example
 * ```ts
 * const res: ApiResponse<HashResult> = await client.hash({ algorithm: 'sha256', data: 'hello' });
 * console.log(res.data.digest);
 * ```
 */
export interface ApiResponse<T> {
  /** Response payload. */
  data: T;
}

/**
 * Error response returned by the API on failure.
 *
 * @example
 * ```ts
 * try {
 *   await client.hash({ algorithm: 'invalid', data: 'x' });
 * } catch (err) {
 *   const apiErr = (err as CryptoApiError).body satisfies ApiError;
 *   console.error(apiErr.error, apiErr.details);
 * }
 * ```
 */
export interface ApiError {
  /** Human-readable error message. */
  error: string;
  /** Optional per-field validation errors. */
  details?: Array<{
    /** Name of the invalid field. */
    field: string;
    /** Validation failure description. */
    message: string;
  }>;
}

// --- Response types ---

/**
 * Result of a hash operation.
 *
 * @example
 * ```ts
 * const { data } = await client.hash({ algorithm: 'sha256', data: 'hello' });
 * const result: HashResult = data;
 * console.log(result.digest, result.algorithm, result.length);
 * ```
 */
export interface HashResult {
  /** Hex-encoded digest. */
  digest: string;
  /** Hash algorithm used (e.g. `"sha256"`). */
  algorithm: string;
  /** Digest length in bytes. */
  length: number;
}

/**
 * Result of an AEAD encryption operation.
 *
 * @example
 * ```ts
 * const { data } = await client.encrypt({ key: hexKey, plaintext: 'secret' });
 * const result: AeadResult = data;
 * console.log(result.ciphertext, result.algorithm);
 * ```
 */
export interface AeadResult {
  /** Hex-encoded ciphertext (includes nonce and tag). */
  ciphertext: string;
  /** AEAD algorithm used. */
  algorithm: string;
}

/**
 * Result of a key derivation function operation.
 *
 * @example
 * ```ts
 * const { data } = await client.kdf({ algorithm: 'hkdf-sha256', password: 'pw' });
 * const result: KdfResult = data;
 * console.log(result.derivedKey, result.salt, result.keyLength);
 * ```
 */
export interface KdfResult {
  /** Hex-encoded derived key. */
  derivedKey: string;
  /** Hex-encoded salt used for derivation. */
  salt: string;
  /** KDF algorithm used. */
  algorithm: string;
  /** Length of the derived key in bytes. */
  keyLength: number;
}

/**
 * Ed25519 key pair returned by key generation.
 *
 * @example
 * ```ts
 * const { data } = await client.generateKeyPair({ algorithm: 'ed25519' });
 * const keys: Ed25519KeyPair = { privateKey: data.privateKey, publicKey: data.publicKey };
 * ```
 */
export interface Ed25519KeyPair {
  /** Hex-encoded Ed25519 private key. */
  privateKey: string;
  /** Hex-encoded Ed25519 public key. */
  publicKey: string;
}

/**
 * Result of a signing operation.
 *
 * @example
 * ```ts
 * const { data } = await client.sign({ privateKey: hexKey, message: 'hello' });
 * const result: SignResult = data;
 * console.log(result.signature, result.algorithm);
 * ```
 */
export interface SignResult {
  /** Hex-encoded signature bytes. */
  signature: string;
  /** Signing algorithm used (e.g. `"ed25519"`). */
  algorithm: string;
}

/**
 * Result of a signature verification operation.
 *
 * @example
 * ```ts
 * const { data } = await client.verify({ publicKey, message: 'hello', signature: sig });
 * const result: VerifyResult = data;
 * console.log(result.valid); // true or false
 * ```
 */
export interface VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Signing algorithm used for verification. */
  algorithm: string;
}

/**
 * Hybrid X25519+ML-KEM key pair for post-quantum key exchange.
 *
 * @example
 * ```ts
 * const { data } = await client.pqGenerateKeyPair();
 * const keys: HybridKeyPair = data;
 * console.log(keys.x25519PublicKey, keys.mlKemPublicKey);
 * ```
 */
export interface HybridKeyPair {
  /** Hex-encoded X25519 private key. */
  x25519PrivateKey: string;
  /** Hex-encoded X25519 public key. */
  x25519PublicKey: string;
  /** Hex-encoded ML-KEM public (encapsulation) key. */
  mlKemPublicKey: string;
  /** Hex-encoded ML-KEM secret (decapsulation) key. */
  mlKemSecretKey: string;
  /** Hybrid KEM algorithm identifier. */
  algorithm: string;
}

/**
 * Result of a hybrid KEM encapsulation operation.
 *
 * @example
 * ```ts
 * const { data } = await client.pqEncapsulate({
 *   x25519PublicKey: keys.x25519PublicKey,
 *   mlKemPublicKey: keys.mlKemPublicKey,
 * });
 * const result: HybridEncapsulateResult = data;
 * console.log(result.sharedSecret, result.mlKemCiphertext);
 * ```
 */
export interface HybridEncapsulateResult {
  /** Hex-encoded ephemeral X25519 public key. */
  x25519EphemeralPublic: string;
  /** Hex-encoded ML-KEM ciphertext. */
  mlKemCiphertext: string;
  /** Hex-encoded combined shared secret. */
  sharedSecret: string;
  /** Hybrid KEM algorithm identifier. */
  algorithm: string;
}

/**
 * ML-DSA (Dilithium) key pair for post-quantum digital signatures.
 *
 * @example
 * ```ts
 * const { data } = await client.pqSignKeygen({ level: 65 });
 * const keys: MlDsaKeyPair = data;
 * console.log(keys.publicKey, keys.algorithm); // "ml-dsa-65"
 * ```
 */
export interface MlDsaKeyPair {
  /** Hex-encoded ML-DSA public key. */
  publicKey: string;
  /** Hex-encoded ML-DSA secret key. */
  secretKey: string;
  /** ML-DSA algorithm level (e.g. `"ml-dsa-65"`). */
  algorithm: string;
}

/**
 * Result of an ML-DSA signing operation.
 *
 * @example
 * ```ts
 * const { data } = await client.pqSign({ level: 65, secretKey, message: 'hello' });
 * const result: MlDsaSignResult = data;
 * console.log(result.signature, result.algorithm);
 * ```
 */
export interface MlDsaSignResult {
  /** Hex-encoded ML-DSA signature. */
  signature: string;
  /** ML-DSA algorithm level used for signing. */
  algorithm: string;
}

/**
 * Result of an ML-DSA signature verification.
 *
 * @example
 * ```ts
 * const { data } = await client.pqVerify({ level: 65, publicKey, message: 'hello', signature: sig });
 * const result: MlDsaVerifyResult = data;
 * console.log(result.valid); // true or false
 * ```
 */
export interface MlDsaVerifyResult {
  /** Whether the ML-DSA signature is valid. */
  valid: boolean;
  /** ML-DSA algorithm level used for verification. */
  algorithm: string;
}

/**
 * SLH-DSA (SPHINCS+) key pair for hash-based post-quantum signatures.
 *
 * @example
 * ```ts
 * const { data } = await client.pqHashSignKeygen({ variant: 'shake-128f' });
 * const keys: SlhDsaKeyPair = data;
 * console.log(keys.publicKey, keys.algorithm);
 * ```
 */
export interface SlhDsaKeyPair {
  /** Hex-encoded SLH-DSA public key. */
  publicKey: string;
  /** Hex-encoded SLH-DSA secret key. */
  secretKey: string;
  /** SLH-DSA variant identifier (e.g. `"slh-dsa-shake-128f"`). */
  algorithm: string;
}

/**
 * Result of an SLH-DSA signing operation.
 *
 * @example
 * ```ts
 * const { data } = await client.pqHashSign({ variant: 'shake-128f', secretKey, message: 'hello' });
 * const result: SlhDsaSignResult = data;
 * console.log(result.signature);
 * ```
 */
export interface SlhDsaSignResult {
  /** Hex-encoded SLH-DSA signature. */
  signature: string;
  /** SLH-DSA variant used for signing. */
  algorithm: string;
}

/**
 * Result of an SLH-DSA signature verification.
 *
 * @example
 * ```ts
 * const { data } = await client.pqHashVerify({ variant: 'shake-128f', publicKey, message: 'hello', signature: sig });
 * const result: SlhDsaVerifyResult = data;
 * console.log(result.valid); // true or false
 * ```
 */
export interface SlhDsaVerifyResult {
  /** Whether the SLH-DSA signature is valid. */
  valid: boolean;
  /** SLH-DSA variant used for verification. */
  algorithm: string;
}

/**
 * Result of a secretbox seal operation (symmetric authenticated encryption).
 *
 * @example
 * ```ts
 * const { data } = await client.secretboxSeal({ key: hexKey, plaintext: 'secret' });
 * const result: SecretboxSealResult = data;
 * console.log(result.sealed);
 * ```
 */
export interface SecretboxSealResult {
  /** Hex-encoded sealed ciphertext (nonce + ciphertext + tag). */
  sealed: string;
}

/**
 * Result of a sealed box seal operation (anonymous public-key encryption).
 *
 * @example
 * ```ts
 * const { data } = await client.sealedboxSeal({ recipientPublicKey: pubKey, plaintext: 'secret' });
 * const result: SealedboxSealResult = data;
 * console.log(result.sealed, result.ephemeralPublicKey);
 * ```
 */
export interface SealedboxSealResult {
  /** Hex-encoded sealed ciphertext. */
  sealed: string;
  /** Hex-encoded ephemeral public key used for encryption. */
  ephemeralPublicKey: string;
}

/**
 * Result of a password-based encryption operation.
 *
 * @example
 * ```ts
 * const { data } = await client.passwordEncrypt({ password: 'my-pass', plaintext: 'secret' });
 * const result: PasswordEncryptResult = data;
 * console.log(result.ciphertext);
 * ```
 */
export interface PasswordEncryptResult {
  /** Hex-encoded password-encrypted ciphertext. */
  ciphertext: string;
}

/**
 * Result of an AES key-wrap operation.
 *
 * @example
 * ```ts
 * const { data } = await client.keyWrap({ kek: hexKek, keyToWrap: hexKey });
 * const result: KeyWrapResult = data;
 * console.log(result.wrappedKey);
 * ```
 */
export interface KeyWrapResult {
  /** Hex-encoded wrapped key material. */
  wrappedKey: string;
}

/**
 * Result of a key generation operation.
 *
 * @example
 * ```ts
 * const { data } = await client.generateKeyPair({ algorithm: 'ed25519' });
 * const result: KeyGenerateResult = data;
 * console.log(result.publicKey, result.privateKey, result.kid);
 * ```
 */
export interface KeyGenerateResult {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
  /** Key algorithm (e.g. `"ed25519"`). */
  algorithm: string;
  /** Unique key identifier. */
  kid: string;
}

/**
 * Result of a MAC computation.
 *
 * @example
 * ```ts
 * const { data } = await client.mac({ algorithm: 'hmac-sha256', key: hexKey, data: 'hello' });
 * const result: MacResult = data;
 * console.log(result.mac, result.algorithm);
 * ```
 */
export interface MacResult {
  /** Hex-encoded MAC tag. */
  mac: string;
  /** MAC algorithm used (e.g. `"hmac-sha256"`). */
  algorithm: string;
}

/**
 * Result of a password hashing operation (Argon2).
 *
 * @example
 * ```ts
 * const { data } = await client.passwordHash({ password: 'hunter2' });
 * const result: PasswordHashResult = data;
 * console.log(result.phc); // PHC-format string
 * console.log(result.hash, result.salt, result.params);
 * ```
 */
export interface PasswordHashResult {
  /** Hex-encoded password hash. */
  hash: string;
  /** Hex-encoded salt used for hashing. */
  salt: string;
  /** Argon2 cost parameters (time, memory, parallelism). */
  params: {
    /** Time cost (iterations). */
    t: number;
    /** Memory cost (KiB). */
    m: number;
    /** Parallelism factor. */
    p: number;
  };
  /** Argon2 variant used (e.g. `"argon2id"`). */
  algorithm: string;
  /** PHC-format encoded hash string. */
  phc: string;
}

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
    return this.request("POST", "/v2/mac/compute", params);
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
    return this.request("POST", "/v2/mac/verify", params);
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
    return res.json();
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
