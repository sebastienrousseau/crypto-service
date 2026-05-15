/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Modern cryptographic primitives barrel export.
 *
 * These operations use the noble suite — audited, zero-dependency,
 * pure-JS implementations of modern cryptographic algorithms.
 */

/* c8 ignore start -- barrel re-exports; actual functions tested in source modules */

export { aeadEncrypt, aeadDecrypt } from "./aead";
export type {
  AeadEncryptOptions,
  AeadDecryptOptions,
  AeadEncryptResult,
} from "./aead";

export {
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmSivEncrypt,
  aesGcmSivDecrypt,
} from "./aes";
export type {
  AesGcmEncryptOptions,
  AesGcmEncryptResult,
  AesGcmDecryptOptions,
  AesGcmAlgorithm,
  AesGcmSivEncryptOptions,
  AesGcmSivEncryptResult,
  AesGcmSivDecryptOptions,
  AesGcmSivAlgorithm,
} from "./aes";

export { hash, HASH_ALGORITHMS } from "./hash";
export type { HashOptions, HashResult, HashAlgorithm } from "./hash";

export { kdfDerive, KDF_ALGORITHMS } from "./kdf";
export type { KdfDeriveOptions, KdfResult, KdfAlgorithm } from "./kdf";

export { generateEd25519KeyPair, ed25519Sign, ed25519Verify } from "./signing";
export type { Ed25519KeyPair, SignResult, VerifyResult } from "./signing";

export { generateX25519KeyPair, x25519Exchange } from "./ecdh";
export type { X25519KeyPair, KeyExchangeResult } from "./ecdh";

export {
  mlKemGenerateKeyPair,
  mlKemEncapsulate,
  mlKemDecapsulate,
  hybridGenerateKeyPair,
  hybridEncapsulate,
  hybridDecapsulate,
} from "./pq";
export type {
  MlKemKeyPair,
  MlKemEncapsulateResult,
  MlKemDecapsulateResult,
  HybridKeyPair,
  HybridEncapsulateResult,
  HybridDecapsulateResult,
} from "./pq";

/** ML-KEM (all parameter sets + advanced hybrids). */
export {
  mlKemKeygen,
  mlKemEncapsulate as mlKemEncap,
  mlKemDecapsulate as mlKemDecap,
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
  p256MlKemKeygen,
  p256MlKemEncapsulate,
  p256MlKemDecapsulate,
  x448MlKemKeygen,
  x448MlKemEncapsulate,
  x448MlKemDecapsulate,
} from "./pq-kem";
export type {
  MlKemLevel,
  MlKemAlgorithm,
  MlKemKeyPairResult,
  MlKemEncapsulateResult as MlKemEncapResult,
  MlKemDecapsulateResult as MlKemDecapResult,
  HybridKemAlgorithm,
  HybridKemKeyPair,
  HybridKemEncapsulateResult,
  HybridKemDecapsulateResult,
  P256MlKemKeyPair,
  P256MlKemEncapsulateResult,
  P256MlKemDecapsulateResult,
  X448MlKemKeyPair,
  X448MlKemEncapsulateResult,
  X448MlKemDecapsulateResult,
} from "./pq-kem";

/** ML-DSA digital signatures (FIPS 204). */
export {
  mlDsaKeygen,
  mlDsaSign,
  mlDsaVerify,
  hybridSign,
  hybridVerify,
} from "./pq-sign";
export type {
  MlDsaLevel,
  MlDsaAlgorithm,
  MlDsaKeyPairResult,
  MlDsaSignResult,
  MlDsaVerifyResult,
  HybridSignResult,
  HybridVerifyResult,
} from "./pq-sign";

/** FN-DSA (FALCON / FIPS 206) digital signatures. */
export { fnDsaKeygen, fnDsaSign, fnDsaVerify } from "./fn-dsa";
export type {
  FnDsaLevel,
  FnDsaAlgorithm,
  FnDsaKeyPairResult,
  FnDsaSignResult,
  FnDsaVerifyResult,
} from "./fn-dsa";

/** SLH-DSA stateless hash-based signatures (FIPS 205). */
export { slhDsaKeygen, slhDsaSign, slhDsaVerify } from "./pq-hash-sign";
export type {
  SlhDsaVariant,
  SlhDsaKeyPairResult,
  SlhDsaSignResult,
  SlhDsaVerifyResult,
} from "./pq-hash-sign";

/** HMAC and KMAC message authentication codes. */
export {
  computeHmac,
  verifyHmac,
  HMAC_ALGORITHMS,
  computeKmac,
  verifyKmac,
  KMAC_ALGORITHMS,
} from "./mac";
export type {
  HmacAlgorithm,
  HmacComputeOptions,
  HmacComputeResult,
  HmacVerifyOptions,
  HmacVerifyResult,
  KmacAlgorithm,
  KmacComputeOptions,
  KmacComputeResult,
  KmacVerifyOptions,
  KmacVerifyResult,
} from "./mac";

/** Argon2 password hashing (id, i, d variants). */
export { hashPassword, verifyPassword, verifyPasswordPhc } from "./password";
export type {
  Argon2Variant,
  Argon2Params,
  HashPasswordOptions,
  HashPasswordResult,
  VerifyPasswordOptions,
  VerifyPasswordResult,
  VerifyPhcOptions,
} from "./password";

/** Additional elliptic curves (P-256, P-384, Ed448, X448, Schnorr). */
export {
  generateP256KeyPair,
  p256Sign,
  p256Verify,
  generateP384KeyPair,
  p384Sign,
  p384Verify,
  generateEd448KeyPair,
  ed448Sign,
  ed448Verify,
  generateX448KeyPair,
  x448Exchange,
  ecdhP256,
  ecdhP384,
  generateSchnorrKeyPair,
  schnorrSign,
  schnorrVerify,
} from "./curves";
export type {
  P256KeyPair,
  P256SignResult,
  P256VerifyResult,
  P384KeyPair,
  P384SignResult,
  P384VerifyResult,
  Ed448KeyPair,
  Ed448SignResult,
  Ed448VerifyResult,
  X448KeyPair,
  X448ExchangeResult,
  EcdhP256Result,
  EcdhP384Result,
  SchnorrKeyPair,
  SchnorrSignResult,
  SchnorrVerifyResult,
} from "./curves";

/** HPKE (Hybrid Public Key Encryption, RFC 9180). */
export { hpkeGenerateKeyPair, hpkeSeal, hpkeOpen } from "./hpke";
export type {
  HpkeKem,
  HpkeAead,
  HpkeMode,
  HpkeKeyPair,
  HpkeSealResult,
  HpkeOpenResult,
  HpkeSuiteOptions,
  HpkePskOptions,
} from "./hpke";

/**
 * List of all supported modern algorithms for the /v2/algorithms endpoint.
 */
export const SUPPORTED_ALGORITHMS = {
  /** Supported symmetric encryption algorithms. */
  encryption: [
    "xchacha20-poly1305",
    "aes-128-gcm",
    "aes-256-gcm",
    "aes-128-gcm-siv",
    "aes-256-gcm-siv",
  ],
  /** Supported hash algorithms. */
  hashing: [
    "sha256",
    "sha384",
    "sha512",
    "sha3-256",
    "sha3-512",
    "blake2b",
    "blake3",
  ],
  /** Supported key derivation functions. */
  kdf: [
    "scrypt",
    "hkdf-sha256",
    "pbkdf2-sha256",
    "argon2id",
    "argon2i",
    "argon2d",
  ],
  /** Supported message authentication code algorithms. */
  mac: [
    "hmac-sha256",
    "hmac-sha384",
    "hmac-sha512",
    "hmac-sha3-256",
    "hmac-sha3-512",
    "kmac-128",
    "kmac-256",
  ],
  /** Supported digital signature algorithms. */
  signing: [
    "ed25519",
    "ed448",
    "ecdsa-p256",
    "ecdsa-p384",
    "schnorr",
    "ml-dsa-44",
    "ml-dsa-65",
    "ml-dsa-87",
    "slh-dsa-sha2-128f",
    "slh-dsa-sha2-128s",
    "slh-dsa-sha2-192f",
    "slh-dsa-sha2-192s",
    "slh-dsa-sha2-256f",
    "slh-dsa-sha2-256s",
    "slh-dsa-shake-128f",
    "slh-dsa-shake-128s",
    "slh-dsa-shake-192f",
    "slh-dsa-shake-192s",
    "slh-dsa-shake-256f",
    "slh-dsa-shake-256s",
    "ed25519-ml-dsa-44",
    "ed25519-ml-dsa-65",
    "ed25519-ml-dsa-87",
    "fn-dsa-512",
    "fn-dsa-1024",
  ],
  /** Supported key exchange algorithms. */
  keyExchange: [
    "x25519",
    "x448",
    "ecdh-p256",
    "ecdh-p384",
    "x25519-ml-kem-512",
    "x25519-ml-kem-768",
    "x25519-ml-kem-1024",
    "p256-ml-kem-768",
    "x448-ml-kem-1024",
    "hpke-x25519-chacha20",
    "hpke-x25519-aes128gcm",
    "hpke-p256-aes128gcm",
  ],
  /** Supported post-quantum algorithms. */
  postQuantum: [
    "ml-kem-512",
    "ml-kem-768",
    "ml-kem-1024",
    "ml-dsa-44",
    "ml-dsa-65",
    "ml-dsa-87",
    "slh-dsa-sha2-128f",
    "slh-dsa-sha2-128s",
    "slh-dsa-sha2-192f",
    "slh-dsa-sha2-192s",
    "slh-dsa-sha2-256f",
    "slh-dsa-sha2-256s",
    "slh-dsa-shake-128f",
    "slh-dsa-shake-128s",
    "slh-dsa-shake-192f",
    "slh-dsa-shake-192s",
    "slh-dsa-shake-256f",
    "slh-dsa-shake-256s",
    "fn-dsa-512",
    "fn-dsa-1024",
  ],
} as const;
/* c8 ignore stop */
