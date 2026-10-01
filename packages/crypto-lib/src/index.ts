/**
 * @remarks Main entry point for the Crypto Service Suite library.
 *
 * Re-exports all modules: modern primitives, high-level APIs, key management,
 * streaming, protocols, tokens, acceleration, unified crypto API, and registry.
 */

// OpenPGP operations (encrypt, decrypt, sign, verify, generate, reformat,
// revoke, session). Also published as the "./pgp" subpath. A named
// namespace rather than a default export: a CommonJS default export does
// not survive a native ESM import in Node.
export * as pgp from "./bin/cryptolib";

// Modern cryptographic primitives (noble-based)
export * from "./modern";

// High-level APIs (secretbox, sealedbox, password encryption)
export * from "./high-level";

// Key serialization (hex, base64, PEM, JWK)
export * from "./keys";

// Streaming (incremental hash, stream AEAD)
export * from "./streaming";

// Protocol building blocks (PQXDH, ratchet, PAKE, threshold, ISO 20022)
export * as protocols from "./protocols";
export * from "./protocols/iso20022";

// Token utilities (PASETO v4, key rotation)
export * as tokens from "./tokens";

// WebCrypto acceleration and worker pool
export * from "./accel";

// Unified crypto API
export { crypto } from "./crypto";
/** Re-exported signing algorithm type from the crypto module. */
export type {
  SignAlgorithm,
  VerifyPasswordOptions,
  HmacVerifyOptions,
} from "./crypto";

// Algorithm registry
export {
  getAlgorithm,
  listAlgorithms,
  recommended,
  isDeprecated,
} from "./registry";
/** Re-exported algorithm registry types. */
export type {
  AlgorithmInfo,
  AlgorithmCategory,
  AlgorithmStatus,
  SecurityLevel,
} from "./registry";

// Branded error class and error codes
export { CryptoError, CryptoErrorCode } from "./errors";

// Utilities (constant-time comparison, SecureBuffer, memory zeroing)
export { timingSafeEqual, SecureBuffer, wipeMemory } from "./utils";
