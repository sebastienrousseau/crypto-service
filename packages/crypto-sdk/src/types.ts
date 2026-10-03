/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/** Request and response types for the Crypto Service Suite v2 API. */

/**
 * @remarks TypeScript SDK for the Crypto Service Suite v2 API.
 *
 * Zero-dependency, fetch-based typed client for all cryptographic operations.
 * Types for server-held keys (key generation, signing, decapsulation and
 * sealed boxes) live in `key-types.ts`.
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

/** Options for configuring client-side retry behavior on transient errors. */
export interface RetryOptions {
  /** Maximum number of retries for transient errors (429, 503, 504). Default: 0 (disabled). */
  maxRetries?: number;
  /** Initial retry delay in milliseconds. Default: 200. */
  initialDelayMs?: number;
  /** Maximum retry delay in milliseconds. Default: 2000. */
  maxDelayMs?: number;
}

export interface ClientOptions {
  /** Base URL of the crypto server (e.g., "http://localhost:3000"). */
  baseUrl: string;
  /** API key for x-api-key header authentication. */
  apiKey?: string;
  /** JWT Bearer token for Authorization header. */
  token?: string;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Automatic retry options for transient errors (429, 503, 504). */
  retry?: RetryOptions;
  /**
   * Optional W3C Trace Context traceparent header or generation flag.
   * If a string is provided, it is sent as the traceparent header.
   * If `true`, a fresh compliant W3C traceparent is generated per request.
   */
  traceparent?: string | boolean;
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

/** One failed check in a `validation-failed` problem. */
export interface ApiErrorField {
  /** JSON pointer to the invalid field (e.g. `"/algorithm"`). */
  field: string;
  /** Validation failure description. */
  message: string;
}

/**
 * Error body returned by the API on failure: an RFC 9457 problem
 * (`application/problem+json`).
 *
 * @example
 * ```ts
 * try {
 *   await client.sign({ keyId: 'k_unknown0000000000000000', message: 'x' });
 * } catch (err) {
 *   const problem = (err as CryptoApiError).body satisfies ApiError;
 *   console.error(problem.type, problem.detail, problem.code);
 * }
 * ```
 */
export interface ApiError {
  /** Problem type, `urn:crypto-service:problem:<slug>` (or `about:blank`). */
  type: string;
  /** Short summary of the problem type. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Explanation of this occurrence. */
  detail: string;
  /** Request path of this occurrence. */
  instance?: string;
  /** Machine-readable code for crypto-lib and key-store errors (e.g. `"KEY_NOT_FOUND"`). */
  code?: string;
  /** Per-field failures of a `validation-failed` problem. */
  errors?: ApiErrorField[];
  /** Other extension members (e.g. `tier`, `limit`, `resetSeconds`). */
  [extension: string]: unknown;
}

// --- Algorithm names accepted by the server ---

/** Hash algorithms accepted by `POST /v2/hash`. */
export type HashAlgorithm =
  | "sha256"
  | "sha384"
  | "sha512"
  | "sha3-256"
  | "sha3-512"
  | "blake2b"
  | "blake3";

/** HMAC hash functions accepted by `POST /v2/hmac` and `/v2/hmac/verify`. */
export type HmacAlgorithm =
  "sha256" | "sha384" | "sha512" | "sha3-256" | "sha3-512";

/** Key derivation functions accepted by `POST /v2/kdf`. */
export type KdfAlgorithm = "scrypt" | "hkdf-sha256" | "pbkdf2-sha256";

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
 * Result of `POST /v2/encrypt` (XChaCha20-Poly1305).
 *
 * @example
 * ```ts
 * const { data } = await client.encrypt({ key: hexKey, plaintext: 'secret' });
 * const result: AeadResult = data;
 * console.log(result.ciphertext, result.algorithm);
 * ```
 */
export interface AeadResult {
  /** Base64-encoded nonce, ciphertext and tag. */
  ciphertext: string;
  /** AEAD algorithm used (`"xchacha20-poly1305"`). */
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
 * Result of `POST /v2/secretbox/seal` (XChaCha20-Poly1305).
 *
 * @example
 * ```ts
 * const { data } = await client.secretboxSeal({ key: hexKey, plaintext: 'secret' });
 * const result: SecretboxSealResult = data;
 * console.log(result.sealed);
 * ```
 */
export interface SecretboxSealResult {
  /** Base64-encoded sealed ciphertext (nonce + ciphertext + tag). */
  sealed: string;
  /** AEAD algorithm used (`"xchacha20-poly1305"`). */
  algorithm: string;
}

/**
 * Result of `POST /v2/password/encrypt` (Argon2id + XChaCha20-Poly1305).
 *
 * @example
 * ```ts
 * const { data } = await client.passwordEncrypt({ password: 'my-pass', plaintext: 'secret' });
 * const result: PasswordEncryptResult = data;
 * await client.passwordDecrypt({ password: 'my-pass', ciphertext: result.encrypted });
 * ```
 */
export interface PasswordEncryptResult {
  /** Base64-encoded payload (parameters, salt, nonce and ciphertext). */
  encrypted: string;
  /** Construction used (`"argon2id-xchacha20-poly1305"`). */
  algorithm: string;
}

/** Key-wrapping algorithms accepted by `/v2/keys/wrap` and `/v2/keys/unwrap`. */
export type KeyWrapAlgorithm = "aes-kw" | "aes-kwp";

/**
 * Result of `POST /v2/keys/wrap` (AES-KW, RFC 3394, or AES-KWP, RFC 5649).
 *
 * @example
 * ```ts
 * const { data } = await client.keyWrap({ kek: hexKek, keyToWrap: hexKey });
 * const result: KeyWrapResult = data;
 * await client.keyUnwrap({ kek: hexKek, wrappedKey: result.wrapped });
 * ```
 */
export interface KeyWrapResult {
  /** Base64-encoded wrapped key. */
  wrapped: string;
  /** Key-wrapping algorithm used. */
  algorithm: KeyWrapAlgorithm;
}

/** Result of `GET /health`. */
export interface HealthResult {
  /** HTTP status code reported by the health check. */
  statusCode: number;
  /** Health status (`"ok"` when healthy). */
  status?: string;
  /** Process uptime in seconds. */
  uptime?: number;
}

/**
 * DORA self-assessment returned by `/v2/compliance/dora`. It describes the
 * algorithms the suite implements; it is not a compliance verdict.
 */
export interface DoraComplianceScorecard {
  /** Regulatory standard identifier. */
  standard: string;
  /** Specific regulatory articles evaluated. */
  article: string;
  /** Assessment status, e.g. "Self-assessment (not a compliance verdict)". */
  status: string;
  /** Statement of what the assessment does and does not establish. */
  disclaimer: string;
  /** Percentage of post-quantum resilient algorithms. */
  quantumResistanceRatio: number;
  /** Total count of active cryptographic primitives. */
  activePrimitivesCount: number;
  /** Total count of post-quantum primitives. */
  postQuantumPrimitivesCount: number;
  /** Deprecation schedule for classical algorithms. */
  algorithmDeprecationSchedule: Array<{
    algorithm: string;
    category: string;
    sunsetDate: string;
    recommendedMigration: string;
  }>;
  /** Complete cryptographic package inventory. */
  cryptographicInventory: Array<{
    package: string;
    version: string;
    status: string;
    fipsCompliance: string;
  }>;
  /** Scorecard timestamp. */
  timestamp: string;
}

/** Machine-readable CycloneDX Cryptographic Bill of Materials (CBOM) payload. */
export interface CbomExportPayload {
  /** BOM format specification. */
  bomFormat: string;
  /** Specification version. */
  specVersion: string;
  /** Unique serial number URN. */
  serialNumber: string;
  /** BOM schema version. */
  version: number;
  /** Metadata describing generation environment and root component. */
  metadata: Record<string, unknown>;
  /** Complete component manifest. */
  components: Array<Record<string, unknown>>;
}

/** Options for dynamic cryptographic algorithm negotiation. */
export interface AlgorithmNegotiationOptions {
  /** Maximum single-packet payload bytes (e.g. 1500 for standard Ethernet MTU). */
  maxPayloadBytes?: number;
  /** Minimum NIST post-quantum security category required (1, 3, or 5). Defaults to 1. */
  securityCategoryMin?: 1 | 3 | 5;
  /** Whether hybrid classical + post-quantum pairing is mandatory (e.g., BSI/ANSSI rules). */
  requireHybrid?: boolean;
  /** Client-supported algorithm list filter. */
  clientSupportedAlgorithms?: string[];
}

/** Result of dynamic cryptographic algorithm negotiation. */
export interface AlgorithmNegotiationResult {
  /** Chosen algorithm identifier. */
  selectedAlgorithm: string;
  /** Cipher category. */
  cipherCategory: "lattice-kem" | "hybrid-kem" | "classical-ecdh";
  /** Security level (NIST Category 1, 3, or 5). */
  securityCategory: 1 | 3 | 5;
  /** Whether chosen algorithm is a composite hybrid. */
  isHybrid: boolean;
  /** Public key size in bytes. */
  publicKeyBytes: number;
  /** Ciphertext size in bytes. */
  ciphertextBytes: number;
  /** Total transport overhead in bytes. */
  totalPayloadOverhead: number;
  /** Whether ciphertext fits within maxPayloadBytes without IP fragmentation. */
  fitsWithinMtu: boolean;
  /** Ordered list of fallback algorithm candidates evaluated. */
  fallbackChain: string[];
  /** Regulatory and DORA Article 13 compliance posture. */
  compliancePosture: {
    standard: string;
    doraArticle13Compliant: boolean;
    fipsStandard: string;
  };
}

/**
 * Result of `POST /v2/hmac`.
 *
 * @example
 * ```ts
 * const { data } = await client.mac({ algorithm: 'sha256', key: hexKey, data: 'hello' });
 * const result: MacResult = data;
 * console.log(result.mac, result.algorithm);
 * ```
 */
export interface MacResult {
  /** Hex-encoded MAC tag. */
  mac: string;
  /** HMAC hash function used (e.g. `"sha256"`). */
  algorithm: string;
}

/** Result of `POST /v2/hmac/verify`. */
export interface MacVerifyResult {
  /** Whether the MAC is valid. */
  valid: boolean;
  /** HMAC hash function used. */
  algorithm: string;
}

/** Argon2 cost parameters. */
export interface Argon2Params {
  /** Time cost (iterations). */
  t: number;
  /** Memory cost (KiB). */
  m: number;
  /** Parallelism factor. */
  p: number;
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
  params: Argon2Params;
  /** Argon2 variant used (e.g. `"argon2id"`). */
  algorithm: string;
  /** PHC-format encoded hash string. */
  phc: string;
}

/** Parameters for hybrid post-quantum stream encryption. */
export interface StreamPqEncryptParams {
  /** Recipient X25519 public key (64 hex characters). */
  x25519PublicKey: string;
  /** Recipient ML-KEM-768 public key (hex string). */
  mlKemPublicKey: string;
  /** Plaintext data to encrypt. */
  plaintext: string;
  /** Chunk size in bytes (optional, default 65536). */
  chunkSize?: number;
}

/** Result of hybrid post-quantum stream encryption. */
export interface StreamPqEncryptResult {
  /** Base64-encoded encrypted stream ciphertext. */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: "x25519-ml-kem-768-xchacha20-poly1305-stream";
}

/** Parameters for hybrid post-quantum stream decryption. */
export interface StreamPqDecryptParams {
  /** Server-held keyId of algorithm x25519-ml-kem-768. */
  keyId: string;
  /** Base64-encoded stream ciphertext. */
  ciphertext: string;
  /** Chunk size used during encryption (optional). */
  chunkSize?: number;
}

/** Result of hybrid post-quantum stream decryption. */
export interface StreamPqDecryptResult {
  /** Recovered plaintext string. */
  plaintext: string;
}

/** Recipient public keys for multi-recipient post-quantum stream encryption. */
export interface StreamMultiPqRecipient {
  /** Unique recipient identifier (1 to 255 UTF-8 characters). */
  recipientId: string;
  /** Recipient X25519 public key (64 hex characters). */
  x25519PublicKey: string;
  /** Recipient ML-KEM-768 public key (hex string). */
  mlKemPublicKey: string;
}

/** Parameters for multi-recipient hybrid post-quantum stream encryption. */
export interface StreamMultiPqEncryptParams {
  /** Array of recipients who can decrypt the stream. */
  recipients: StreamMultiPqRecipient[];
  /** Plaintext data to encrypt. */
  plaintext: string;
  /** Chunk size in bytes (optional, default 65536). */
  chunkSize?: number;
}

/** Result of multi-recipient hybrid post-quantum stream encryption. */
export interface StreamMultiPqEncryptResult {
  /** Base64-encoded encrypted stream ciphertext. */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: "multi-x25519-ml-kem-768-xchacha20-poly1305-stream";
  /** Number of recipient key slots encapsulated in header. */
  recipientCount: number;
}

/** Parameters for multi-recipient hybrid post-quantum stream decryption. */
export interface StreamMultiPqDecryptParams {
  /** Server-held keyId of algorithm x25519-ml-kem-768. */
  keyId: string;
  /** Optional recipient identifier to locate slot directly. */
  recipientId?: string;
  /** Base64-encoded stream ciphertext. */
  ciphertext: string;
  /** Chunk size override (optional). */
  chunkSize?: number;
}

/** Result of multi-recipient hybrid post-quantum stream decryption. */
export interface StreamMultiPqDecryptResult {
  /** Recovered plaintext string. */
  plaintext: string;
  /** Identifier of recipient slot that decrypted the stream. */
  recipientId: string;
}
