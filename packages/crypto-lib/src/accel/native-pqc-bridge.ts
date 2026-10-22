/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks ML-KEM through the native post-quantum back end.
 *
 * Key generation, encapsulation and decapsulation run in Node.js's
 * OpenSSL where the runtime has ML-KEM (Node.js 24.7 and later), and in
 * @noble/post-quantum elsewhere; see `pq-backend.ts`. Keys, ciphertexts
 * and shared secrets are the same raw bytes either way.
 */

import {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
  nativeAlgorithms,
} from "./pq-backend";
import { CryptoError, CryptoErrorCode } from "../errors";

// --- Feature Detection ---

/** Cached detection result (undefined = not yet checked). */
let _nativePqcDetected: boolean | undefined;

/**
 * Whether ML-KEM runs natively on this runtime, at every level.
 *
 * @example
 * ```ts
 * if (hasNativePqc()) {
 *   console.log("Native PQC acceleration available");
 * }
 * ```
 */
export function hasNativePqc(): boolean {
  if (_nativePqcDetected !== undefined) return _nativePqcDetected;
  const native = nativeAlgorithms();
  _nativePqcDetected = ["ml-kem-512", "ml-kem-768", "ml-kem-1024"].every(
    (name) => native.includes(name),
  );
  return _nativePqcDetected;
}

/**
 * Reset the cached detection (useful for testing).
 *
 * @example
 * ```ts
 * resetNativePqcCache();
 * ```
 */
export function resetNativePqcCache(): void {
  _nativePqcDetected = undefined;
}

/**
 * Force the cached detection to a specific value (for testing).
 *
 * @example
 * ```ts
 * _forceNativePqcDetected(false);
 * ```
 */
export function _forceNativePqcDetected(value: boolean): void {
  _nativePqcDetected = value;
}

/** PQC backend in use: `"native"` (OpenSSL 3.5+) or `"noble"` (pure JS). */
export type PqcBackend = "native" | "noble";

/**
 * Returns the active PQC backend name.
 *
 * @example
 * ```ts
 * console.log(pqcBackend()); // "native" or "noble"
 * ```
 */
export function pqcBackend(): PqcBackend {
  return hasNativePqc() ? "native" : "noble";
}

// --- Types ---

/** ML-KEM security level (NIST Level 1/3/5). */
export type NativeMlKemLevel = 512 | 768 | 1024;

/** Result of an ML-KEM key generation operation. */
export interface BridgedMlKemKeygenResult {
  /** Raw public (encapsulation) key bytes. */
  publicKey: Uint8Array;
  /** Raw secret (decapsulation) key bytes. */
  secretKey: Uint8Array;
}

/** Result of an ML-KEM encapsulation operation. */
export interface BridgedMlKemEncapsulateResult {
  /** Ciphertext to send to the secret key holder. */
  cipherText: Uint8Array;
  /** 32-byte shared secret. */
  sharedSecret: Uint8Array;
}

// --- Helpers ---

const VALID_LEVELS = new Set<number>([512, 768, 1024]);

function assertLevel(level: number): asserts level is NativeMlKemLevel {
  if (!VALID_LEVELS.has(level)) {
    throw new CryptoError(
      `Unsupported ML-KEM level: ${level}. Supported: 512, 768, 1024`,
      CryptoErrorCode.UNSUPPORTED_ALGORITHM,
    );
  }
}

function getKem(level: NativeMlKemLevel) {
  switch (level) {
    case 512:
      return ml_kem512;
    case 768:
      return ml_kem768;
    case 1024:
      return ml_kem1024;
  }
}

// --- Bridge Functions ---

/**
 * ML-KEM key generation, native where the runtime has ML-KEM.
 *
 * @param level - ML-KEM security level (512, 768, or 1024).
 * @returns Raw public and secret key bytes.
 *
 * @example
 * ```ts
 * const { publicKey, secretKey } = bridgedMlKemKeygen(768);
 * ```
 */
export function bridgedMlKemKeygen(
  level: NativeMlKemLevel,
): BridgedMlKemKeygenResult {
  assertLevel(level);
  const kem = getKem(level);
  return kem.keygen();
}

/**
 * ML-KEM encapsulation, native where the runtime has ML-KEM: the raw
 * public key is imported in an SPKI wrapper and `crypto.encapsulate()`
 * runs in OpenSSL. Falls back to @noble/post-quantum elsewhere.
 *
 * @param level - ML-KEM security level (512, 768, or 1024).
 * @param publicKey - Raw public (encapsulation) key bytes from `bridgedMlKemKeygen`.
 * @returns Ciphertext and 32-byte shared secret.
 *
 * @example
 * ```ts
 * const { cipherText, sharedSecret } = bridgedMlKemEncapsulate(768, publicKey);
 * ```
 */
export function bridgedMlKemEncapsulate(
  level: NativeMlKemLevel,
  publicKey: Uint8Array,
): BridgedMlKemEncapsulateResult {
  assertLevel(level);
  const kem = getKem(level);
  return kem.encapsulate(publicKey);
}

/**
 * ML-KEM decapsulation, native where the runtime has ML-KEM: the raw
 * secret key is imported in a PKCS#8 wrapper and `crypto.decapsulate()`
 * runs in OpenSSL. Falls back to @noble/post-quantum elsewhere.
 *
 * @param level - ML-KEM security level (512, 768, or 1024).
 * @param cipherText - Ciphertext from `bridgedMlKemEncapsulate`.
 * @param secretKey - Raw secret (decapsulation) key bytes from `bridgedMlKemKeygen`.
 * @returns 32-byte shared secret.
 *
 * @example
 * ```ts
 * const sharedSecret = bridgedMlKemDecapsulate(768, cipherText, secretKey);
 * ```
 */
export function bridgedMlKemDecapsulate(
  level: NativeMlKemLevel,
  cipherText: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  assertLevel(level);
  const kem = getKem(level);
  return kem.decapsulate(cipherText, secretKey);
}
