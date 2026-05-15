import CryptoLib from "./bin/cryptolib";

export default CryptoLib;

// Modern cryptographic primitives (noble-based)
export * from "./modern";

// High-level APIs (secretbox, sealedbox, password encryption)
export * from "./high-level";

// Key serialization (hex, base64, PEM, JWK)
export * from "./keys";

// Streaming (incremental hash, stream AEAD)
export * from "./streaming";

// Protocol building blocks (PQXDH, ratchet, PAKE, threshold)
export * as protocols from "./protocols";

// Token utilities (PASETO v4, key rotation)
export * as tokens from "./tokens";

// WebCrypto acceleration and worker pool
export * from "./accel";

// Unified crypto API
export { crypto } from "./crypto";
export type { SignAlgorithm } from "./crypto";

// Algorithm registry
export {
  getAlgorithm,
  listAlgorithms,
  recommended,
  isDeprecated,
} from "./registry";
export type {
  AlgorithmInfo,
  AlgorithmCategory,
  AlgorithmStatus,
  SecurityLevel,
} from "./registry";

// Utilities (constant-time comparison, SecureBuffer)
export { timingSafeEqual, SecureBuffer } from "./utils";
