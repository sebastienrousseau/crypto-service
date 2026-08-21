/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks FN-DSA (FALCON / FIPS 206) — lattice-based digital signatures.
 *
 * FN-DSA provides the smallest signature sizes among NIST PQC standards:
 * - FN-DSA-512: ~666 byte signatures (NIST Level 1)
 * - FN-DSA-1024: ~1280 byte signatures (NIST Level 5)
 */

import { falcon512, falcon1024 } from "@noble/post-quantum/falcon.js";

// --- Types ---

/**
 * FN-DSA security level.
 *
 * @example
 * ```ts
 * const level: FnDsaLevel = 512;
 * ```
 */
export type FnDsaLevel = 512 | 1024;

/**
 * FN-DSA algorithm identifier string.
 *
 * @example
 * ```ts
 * const alg: FnDsaAlgorithm = "fn-dsa-512";
 * ```
 */
export type FnDsaAlgorithm = "fn-dsa-512" | "fn-dsa-1024";

/**
 * FN-DSA key pair (public + secret keys).
 *
 * @example
 * ```ts
 * const kp: FnDsaKeyPairResult = fnDsaKeygen(512);
 * console.log(kp.publicKey, kp.secretKey, kp.algorithm);
 * ```
 */
export interface FnDsaKeyPairResult {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded secret key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: FnDsaAlgorithm;
}

/**
 * Result of an FN-DSA signing operation.
 *
 * @example
 * ```ts
 * const result: FnDsaSignResult = fnDsaSign(512, secretKeyHex, messageHex);
 * console.log(result.signature, result.algorithm);
 * ```
 */
export interface FnDsaSignResult {
  /** Hex-encoded signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: FnDsaAlgorithm;
}

/**
 * Result of an FN-DSA signature verification.
 *
 * @example
 * ```ts
 * const result: FnDsaVerifyResult = fnDsaVerify(512, publicKeyHex, messageHex, signatureHex);
 * console.log(result.valid, result.algorithm);
 * ```
 */
export interface FnDsaVerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: FnDsaAlgorithm;
}

// --- Helpers ---

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Parse a hex string into bytes, throwing on invalid input. */
function assertHex(input: string, label: string): Uint8Array {
  if (!HEX_RE.test(input)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(input, "hex");
}

/** Retrieve the FALCON implementation for the given security level. */
function getFalcon(level: FnDsaLevel) {
  switch (level) {
    case 512:
      return falcon512;
    case 1024:
      return falcon1024;
    default:
      throw new Error(
        `Unsupported FN-DSA level: ${level}. Supported: 512, 1024`,
      );
  }
}

/** Build the FN-DSA algorithm identifier string from a security level. */
function algorithmName(level: FnDsaLevel): FnDsaAlgorithm {
  return `fn-dsa-${level}` as FnDsaAlgorithm;
}

// --- FN-DSA standalone ---

/**
 * Generate an FN-DSA key pair for the specified security level.
 *
 * @param level - Security level: 512 (NIST Level 1) or 1024 (NIST Level 5).
 * @returns Key pair with hex-encoded public and secret keys.
 *
 * @example
 * ```ts
 * const kp = fnDsaKeygen(512);
 * console.log(kp.publicKey);  // hex string
 * console.log(kp.secretKey);  // hex string
 * console.log(kp.algorithm);  // "fn-dsa-512"
 * ```
 */
export function fnDsaKeygen(level: FnDsaLevel): FnDsaKeyPairResult {
  const falcon = getFalcon(level);
  const { publicKey, secretKey } = falcon.keygen();
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Sign a message with FN-DSA.
 *
 * @param level - Security level: 512 or 1024.
 * @param secretKeyHex - Hex-encoded secret key.
 * @param messageHex - Hex-encoded message to sign.
 * @returns Signature result with hex-encoded signature.
 *
 * @example
 * ```ts
 * const kp = fnDsaKeygen(512);
 * const msg = Buffer.from("hello").toString("hex");
 * const sig = fnDsaSign(512, kp.secretKey, msg);
 * console.log(sig.signature);  // hex string
 * ```
 */
export function fnDsaSign(
  level: FnDsaLevel,
  secretKeyHex: string,
  messageHex: string,
): FnDsaSignResult {
  const falcon = getFalcon(level);
  const secretKey = assertHex(secretKeyHex, "secretKey");
  const msg = assertHex(messageHex, "message");
  const signature = falcon.sign(msg, secretKey);
  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Verify an FN-DSA signature.
 *
 * @param level - Security level: 512 or 1024.
 * @param publicKeyHex - Hex-encoded public key.
 * @param messageHex - Hex-encoded message that was signed.
 * @param signatureHex - Hex-encoded signature to verify.
 * @returns Verification result with validity flag.
 *
 * @example
 * ```ts
 * const kp = fnDsaKeygen(512);
 * const msg = Buffer.from("hello").toString("hex");
 * const sig = fnDsaSign(512, kp.secretKey, msg);
 * const result = fnDsaVerify(512, kp.publicKey, msg, sig.signature);
 * console.log(result.valid);  // true
 * ```
 */
export function fnDsaVerify(
  level: FnDsaLevel,
  publicKeyHex: string,
  messageHex: string,
  signatureHex: string,
): FnDsaVerifyResult {
  const falcon = getFalcon(level);
  const publicKey = assertHex(publicKeyHex, "publicKey");
  const msg = assertHex(messageHex, "message");
  const signature = assertHex(signatureHex, "signature");
  const valid = falcon.verify(signature, msg, publicKey);
  return {
    valid,
    algorithm: algorithmName(level),
  };
}
