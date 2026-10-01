/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/** Request and response types for the Crypto Service Suite v2 API. */

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
