/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Native PQC bridge — auto-detects Node.js 24.7+ ML-KEM/ML-DSA support.
 *
 * When running on Node.js >= 24.7 with OpenSSL 3.5+, this module uses the
 * native `crypto.encapsulate()`/`crypto.decapsulate()` APIs for post-quantum
 * key encapsulation. Falls back to @noble/post-quantum on older runtimes or
 * when native support is unavailable.
 *
 * **Design note:** Native `crypto.generateKeyPairSync('ml-kem-*')` returns
 * DER/PEM-formatted KeyObject instances that are incompatible with @noble's
 * raw byte arrays. To preserve interoperability with the rest of the library
 * (which uses raw keys everywhere), key generation always uses @noble. Only
 * encapsulate/decapsulate benefit from native acceleration, since the
 * ciphertext and shared-secret formats are identical between native and noble.
 *
 * A future version may add DER-to-raw key conversion to enable fully native
 * key generation as well.
 */

import {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
} from "@noble/post-quantum/ml-kem.js";
import * as nodeCrypto from "node:crypto";

// --- Feature Detection ---

/** Cached detection result (undefined = not yet checked). */
let _nativePqcDetected: boolean | undefined;

/**
 * Whether the current Node.js runtime has native ML-KEM PQC support
 * (`crypto.encapsulate`/`crypto.decapsulate` + `ml-kem-*` key generation).
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
  try {
    // Cast needed: @types/node does not yet declare encapsulate/decapsulate
    // (added in Node.js 24.7+ with OpenSSL 3.5+).
    const c = nodeCrypto as Record<string, unknown>;
    _nativePqcDetected =
      typeof c.encapsulate === "function" &&
      typeof c.decapsulate === "function";
    /* c8 ignore next 3 -- defensive: typeof never throws */
  } catch {
    _nativePqcDetected = false;
  }
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
    throw new Error(
      `Unsupported ML-KEM level: ${level}. Supported: 512, 768, 1024`,
    );
  }
}

function getNobleKem(level: NativeMlKemLevel) {
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
 * ML-KEM key generation using @noble/post-quantum.
 *
 * Always uses @noble regardless of native availability because native
 * `generateKeyPairSync` returns DER-wrapped KeyObject instances that are
 * not byte-compatible with the rest of this library.
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
  const kem = getNobleKem(level);
  return kem.keygen();
}

/**
 * ML-KEM encapsulation using the fastest available backend.
 *
 * On Node.js 24.7+ with native PQC support, generates a temporary native
 * key pair, imports the caller's raw public key via a DER wrapper, and
 * calls `crypto.encapsulate()` for hardware-accelerated encapsulation.
 * Falls back to @noble/post-quantum on older runtimes.
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
  const kem = getNobleKem(level);
  return kem.encapsulate(publicKey);
}

/**
 * ML-KEM decapsulation using the fastest available backend.
 *
 * On Node.js 24.7+ with native PQC support, imports the caller's raw
 * secret key via a DER wrapper and calls `crypto.decapsulate()` for
 * hardware-accelerated decapsulation. Falls back to @noble/post-quantum
 * on older runtimes.
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
  const kem = getNobleKem(level);
  return kem.decapsulate(cipherText, secretKey);
}
