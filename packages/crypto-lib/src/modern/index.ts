/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Modern cryptographic primitives barrel export.
 *
 * These operations use the @noble suite — audited, zero-dependency,
 * pure-JS implementations of modern cryptographic algorithms.
 */

export { aeadEncrypt, aeadDecrypt } from "./aead";
export type {
  AeadEncryptOptions,
  AeadDecryptOptions,
  AeadEncryptResult,
} from "./aead";

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

/**
 * List of all supported modern algorithms for the /v2/algorithms endpoint.
 */
export const SUPPORTED_ALGORITHMS = {
  encryption: ["xchacha20-poly1305"],
  hashing: [
    "sha256",
    "sha384",
    "sha512",
    "sha3-256",
    "sha3-512",
    "blake2b",
    "blake3",
  ],
  kdf: ["scrypt", "hkdf-sha256", "pbkdf2-sha256"],
  signing: ["ed25519"],
  keyExchange: ["x25519", "x25519-ml-kem-768"],
  postQuantum: ["ml-kem-768"],
} as const;
