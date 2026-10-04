/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Types for server-held keys: key generation, export, and the signing,
 * decapsulation and sealed-box operations that use a key by its `keyId`.
 *
 * The server keeps every private key it generates and returns a `keyId`
 * with the public key. Operations that need the private key take the
 * `keyId`; only `CryptoClient.exportKey` returns private material,
 * and only to a principal holding the `crypto:keys:export` scope.
 */

/** Algorithms accepted by `POST /v2/keys/generate`. */
export type KeyAlgorithm =
  | "ed25519"
  | "x25519"
  | "ed448"
  | "x448"
  | "p256"
  | "p384"
  | "ml-kem-512"
  | "ml-kem-768"
  | "ml-kem-1024"
  | "ml-dsa-44"
  | "ml-dsa-65"
  | "ml-dsa-87";

/** ML-DSA (FIPS 204) security levels. */
export type MlDsaLevel = 44 | 65 | 87;

/** SLH-DSA (FIPS 205) parameter sets accepted by the server. */
export type SlhDsaVariant =
  | "sha2-128f"
  | "sha2-128s"
  | "sha2-192f"
  | "sha2-192s"
  | "sha2-256f"
  | "sha2-256s"
  | "shake-128f"
  | "shake-128s"
  | "shake-192f"
  | "shake-192s"
  | "shake-256f"
  | "shake-256s";

/** A reference to a server-held key, as operations that use one take it. */
export interface KeyIdParams {
  /** Identifier returned by a key-generation method (`k_` + 22 characters). */
  keyId: string;
}

/** A message to sign with a server-held key. */
export interface SignParams extends KeyIdParams {
  /** Message to sign (UTF-8). */
  message: string;
}

/** Optional metadata for `POST /v2/keys/generate`. */
export interface KeyMetadata {
  /** Key ID to record (a SHA-256 thumbprint of the public key by default). */
  kid?: string;
  /** Intended use: `"sig"` (signing) or `"enc"` (encryption / key exchange). */
  use?: "sig" | "enc";
  /** Expiry date (ISO 8601). */
  exp?: string;
}

/** Fields every key-generation result carries. */
export interface ServerKey {
  /** Identifier of the server-held key; pass it to operations that use the key. */
  keyId: string;
  /** Algorithm of the key (e.g. `"ed25519"`, `"ml-dsa-65"`). */
  algorithm: string;
}

/**
 * Result of `POST /v2/keys/generate`: the key's identifier and public key.
 * The private key stays on the server.
 *
 * @example
 * ```ts
 * const { data } = await client.generateKeyPair({ algorithm: 'ed25519' });
 * const result: KeyGenerateResult = data;
 * await client.sign({ keyId: result.keyId, message: 'hello' });
 * ```
 */
export interface KeyGenerateResult extends ServerKey {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Key ID recorded in the metadata (SHA-256 thumbprint unless one was given). */
  kid: string;
  /** Metadata recorded with the key. */
  metadata: KeyMetadata;
}

/**
 * Result of `POST /v2/keys/export`: the key's identifier, algorithm, public
 * parts and private parts. The part names depend on the algorithm:
 * `publicKey` / `privateKey` (`/v2/keys/generate`), `publicKey` /
 * `secretKey` (ML-KEM, ML-DSA and SLH-DSA key generation), or
 * `x25519PublicKey` / `mlKemPublicKey` / `x25519PrivateKey` /
 * `mlKemSecretKey` (hybrid key generation).
 */
export interface KeyExportResult extends ServerKey {
  /** Hex-encoded key parts, keyed by name. */
  [part: string]: string;
}

/**
 * Result of `POST /v2/sign` (Ed25519).
 *
 * @example
 * ```ts
 * const { data } = await client.sign({ keyId, message: 'hello' });
 * console.log(data.signature, data.algorithm);
 * ```
 */
export interface SignResult {
  /** Hex-encoded signature bytes. */
  signature: string;
  /** Signing algorithm used (`"ed25519"`). */
  algorithm: string;
}

/** Result of `POST /v2/verify` (Ed25519). */
export interface VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Signing algorithm used for verification. */
  algorithm: string;
}

/** Result of `POST /v2/pq/keygen`: a server-held ML-KEM-768 key. */
export interface MlKemKeyPair extends ServerKey {
  /** Hex-encoded ML-KEM public (encapsulation) key. */
  publicKey: string;
}

/** Result of `POST /v2/pq/encapsulate` (ML-KEM-768). */
export interface MlKemEncapsulateResult {
  /** Hex-encoded ciphertext for the key holder. */
  ciphertext: string;
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** KEM algorithm identifier. */
  algorithm: string;
}

/** Result of `POST /v2/pq/decapsulate` and `POST /v2/pq/hybrid/decapsulate`. */
export interface KemDecapsulateResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** KEM algorithm identifier. */
  algorithm: string;
}

/**
 * Result of `POST /v2/pq/hybrid/keygen`: a server-held X25519 + ML-KEM-768
 * key. The private halves stay on the server.
 *
 * @example
 * ```ts
 * const { data } = await client.pqGenerateKeyPair();
 * const keys: HybridKeyPair = data;
 * console.log(keys.keyId, keys.x25519PublicKey, keys.mlKemPublicKey);
 * ```
 */
export interface HybridKeyPair extends ServerKey {
  /** Hex-encoded X25519 public key. */
  x25519PublicKey: string;
  /** Hex-encoded ML-KEM public (encapsulation) key. */
  mlKemPublicKey: string;
}

/** Result of `POST /v2/pq/hybrid/encapsulate`. */
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

/** Result of `POST /v2/pq/dsa/keygen`: a server-held ML-DSA key. */
export interface MlDsaKeyPair extends ServerKey {
  /** Hex-encoded ML-DSA public key. */
  publicKey: string;
}

/** Result of `POST /v2/pq/dsa/sign`. */
export interface MlDsaSignResult {
  /** Hex-encoded ML-DSA signature. */
  signature: string;
  /** ML-DSA algorithm used (from the key, e.g. `"ml-dsa-65"`). */
  algorithm: string;
}

/** Result of `POST /v2/pq/dsa/verify`. */
export interface MlDsaVerifyResult {
  /** Whether the ML-DSA signature is valid. */
  valid: boolean;
  /** ML-DSA algorithm used for verification. */
  algorithm: string;
}

/** Result of `POST /v2/pq/slh-dsa/keygen`: a server-held SLH-DSA key. */
export interface SlhDsaKeyPair extends ServerKey {
  /** Hex-encoded SLH-DSA public key. */
  publicKey: string;
}

/** Result of `POST /v2/pq/slh-dsa/sign`. */
export interface SlhDsaSignResult {
  /** Hex-encoded SLH-DSA signature. */
  signature: string;
  /** SLH-DSA algorithm used (from the key, e.g. `"slh-dsa-shake-128f"`). */
  algorithm: string;
}

/** Result of `POST /v2/pq/slh-dsa/verify`. */
export interface SlhDsaVerifyResult {
  /** Whether the SLH-DSA signature is valid. */
  valid: boolean;
  /** SLH-DSA algorithm used for verification. */
  algorithm: string;
}

/**
 * Result of `POST /v2/sealedbox/seal` and `POST /v2/sealedbox/seal-pq`.
 *
 * @example
 * ```ts
 * const { data } = await client.sealedboxSeal({ recipientPublicKey, plaintext: 'secret' });
 * const result: SealedboxSealResult = data;
 * console.log(result.sealed, result.algorithm);
 * ```
 */
export interface SealedboxSealResult {
  /** Base64-encoded sealed box. */
  sealed: string;
  /** Sealed-box construction (e.g. `"x25519-xchacha20-poly1305"`). */
  algorithm: string;
}

/** Supported KEM algorithms for HPKE. */
export type HpkeKem = "x25519" | "p256" | "x25519-ml-kem-768";

/** Supported AEAD algorithms for HPKE. */
export type HpkeAead = "chacha20-poly1305" | "aes-128-gcm";

/** Parameters for `POST /v2/hpke/keygen`. */
export interface HpkeGenerateKeyPairParams {
  /** KEM algorithm (defaults to `"x25519-ml-kem-768"`). */
  kem?: HpkeKem;
}

/** Result of `POST /v2/hpke/keygen`: server-held HPKE key pair. */
export interface HpkeKeyPair extends ServerKey {
  /** Hex-encoded HPKE public key. */
  publicKey: string;
}

/** Parameters for `POST /v2/hpke/seal`. */
export interface HpkeSealParams {
  /** Hex-encoded recipient public key. */
  recipientPublicKey: string;
  /** Plaintext message (UTF-8 string or hex). */
  plaintext: string;
  /** KEM algorithm (defaults to `"x25519-ml-kem-768"`). */
  kem?: HpkeKem;
  /** AEAD algorithm (defaults to `"chacha20-poly1305"`). */
  aead?: HpkeAead;
  /** Optional application-specific info string. */
  info?: string;
  /** Optional additional authenticated data (AAD). */
  aad?: string;
  /** Optional pre-shared key (hex). */
  psk?: string;
  /** Optional pre-shared key identifier (hex or string). */
  pskId?: string;
}

/** Result of `POST /v2/hpke/seal`. */
export interface HpkeSealResult {
  /** Hex-encoded ciphertext. */
  ciphertext: string;
  /** Hex-encoded encapsulated key. */
  encapsulatedKey: string;
}

/** Parameters for `POST /v2/hpke/open`. */
export interface HpkeOpenParams {
  /** Identifier of the recipient server-held key. */
  keyId: string;
  /** Hex-encoded encapsulated key from sender. */
  encapsulatedKey: string;
  /** Hex-encoded ciphertext from sender. */
  ciphertext: string;
  /** AEAD algorithm (defaults to `"chacha20-poly1305"`). */
  aead?: HpkeAead;
  /** Optional application-specific info string. */
  info?: string;
  /** Optional additional authenticated data (AAD). */
  aad?: string;
  /** Optional pre-shared key (hex). */
  psk?: string;
  /** Optional pre-shared key identifier (hex or string). */
  pskId?: string;
}

/** Result of `POST /v2/hpke/open`. */
export interface HpkeOpenResult {
  /** Decrypted plaintext decoded as UTF-8. */
  plaintext: string;
  /** Decrypted plaintext as raw hex string. */
  hex: string;
}

// --- KMS Types ---

/** KMS Key Create parameters. */
export interface KmsCreateKeyParams {
  provider?: string;
  algorithm?: string;
  usage?: "encrypt" | "sign" | "wrap";
  metadata?: Record<string, string>;
}

/** KMS Key Wrap parameters. */
export interface KmsWrapParams {
  keyId: string;
  unwrappedKey: string;
  provider?: string;
  context?: Record<string, string>;
}

/** KMS Key Wrap result. */
export interface KmsWrapResult {
  wrappedKey: string;
  keyId: string;
  provider: string;
}

/** KMS Key Unwrap parameters. */
export interface KmsUnwrapParams {
  keyId: string;
  wrappedKey: string;
  provider?: string;
  context?: Record<string, string>;
}

/** KMS Key Unwrap result. */
export interface KmsUnwrapResult {
  unwrappedKey: string;
  keyId: string;
  provider: string;
}

/** KMS Generate Data Key parameters. */
export interface KmsGenerateDataKeyParams {
  keyId: string;
  provider?: string;
  keySpec?: string;
}

/** KMS Generate Data Key result. */
export interface KmsGenerateDataKeyResult {
  plaintext: string;
  ciphertext: string;
  keyId: string;
  provider: string;
}

/** KMS Encrypt parameters. */
export interface KmsEncryptParams {
  keyId: string;
  plaintext: string;
  provider?: string;
  context?: Record<string, string>;
}

/** KMS Encrypt result. */
export interface KmsEncryptResult {
  ciphertext: string;
  keyId: string;
  provider: string;
}

/** KMS Decrypt parameters. */
export interface KmsDecryptParams {
  keyId: string;
  ciphertext: string;
  provider?: string;
  context?: Record<string, string>;
}

/** KMS Decrypt result. */
export interface KmsDecryptResult {
  plaintext: string;
  hex: string;
  keyId: string;
  provider: string;
}
