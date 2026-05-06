/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file ML-DSA (FIPS 204) digital signatures — all three parameter sets + hybrid signing.
 *
 * Implements ML-DSA-44, ML-DSA-65, and ML-DSA-87 for quantum-resistant digital
 * signatures, plus a hybrid scheme combining Ed25519 (classical) + ML-DSA (post-quantum).
 *
 * The hybrid approach produces dual signatures, both of which must verify:
 * - If quantum computers arrive: Ed25519 breaks but ML-DSA protects
 * - If ML-DSA has a flaw: Ed25519 still provides classical security
 */

import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
import { ed25519 } from "@noble/curves/ed25519";

// --- Types ---

/** ML-DSA security level (NIST Level 2/3/5). */
export type MlDsaLevel = 44 | 65 | 87;

/** ML-DSA algorithm identifier string. */
export type MlDsaAlgorithm = "ml-dsa-44" | "ml-dsa-65" | "ml-dsa-87";

/** ML-DSA key pair (public + secret keys). */
export interface MlDsaKeyPairResult {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded secret key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: MlDsaAlgorithm;
}

/** Result of an ML-DSA signing operation. */
export interface MlDsaSignResult {
  /** Hex-encoded signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: MlDsaAlgorithm;
}

/** Result of an ML-DSA signature verification. */
export interface MlDsaVerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: MlDsaAlgorithm;
}

/** Result of an Ed25519 + ML-DSA hybrid signing operation. */
export interface HybridSignResult {
  /** Hex-encoded Ed25519 signature. */
  ed25519Signature: string;
  /** Hex-encoded ML-DSA signature. */
  mlDsaSignature: string;
  /** Algorithm identifier. */
  algorithm: string;
}

/** Result of an Ed25519 + ML-DSA hybrid verification. */
export interface HybridVerifyResult {
  /** Whether both signatures are valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: string;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function assertHex(input: string, label: string): Uint8Array {
  if (!HEX_RE.test(input)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(input, "hex");
}

function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Buffer.from(input, "utf8");
}

function getDsa(level: MlDsaLevel) {
  switch (level) {
    case 44:
      return ml_dsa44;
    case 65:
      return ml_dsa65;
    case 87:
      return ml_dsa87;
    default:
      throw new Error(
        `Unsupported ML-DSA level: ${level}. Supported: 44, 65, 87`,
      );
  }
}

function algorithmName(level: MlDsaLevel): MlDsaAlgorithm {
  return `ml-dsa-${level}` as MlDsaAlgorithm;
}

// --- ML-DSA standalone ---

/**
 * Generate an ML-DSA key pair for the specified security level.
 */
export function mlDsaKeygen(level: MlDsaLevel): MlDsaKeyPairResult {
  const dsa = getDsa(level);
  const { publicKey, secretKey } = dsa.keygen();
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Sign a message with ML-DSA.
 */
export function mlDsaSign(
  level: MlDsaLevel,
  secretKeyHex: string,
  message: string | Uint8Array,
): MlDsaSignResult {
  const dsa = getDsa(level);
  const secretKey = assertHex(secretKeyHex, "secretKey");
  const msg = toBytes(message);
  const signature = dsa.sign(msg, secretKey);
  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Verify an ML-DSA signature.
 */
export function mlDsaVerify(
  level: MlDsaLevel,
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): MlDsaVerifyResult {
  const dsa = getDsa(level);
  const publicKey = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const signature = assertHex(signatureHex, "signature");
  const valid = dsa.verify(signature, msg, publicKey);
  return {
    valid,
    algorithm: algorithmName(level),
  };
}

// --- Hybrid Ed25519 + ML-DSA ---

/**
 * Hybrid sign — produces both an Ed25519 signature and an ML-DSA signature.
 *
 * @param secretKeyEd25519Hex - Ed25519 secret key (hex, 32 bytes).
 * @param secretKeyMlDsaHex - ML-DSA secret key (hex).
 * @param message - Message to sign (string or bytes).
 * @param mlDsaLevel - ML-DSA security level (default: 65).
 */
export function hybridSign(
  secretKeyEd25519Hex: string,
  secretKeyMlDsaHex: string,
  message: string | Uint8Array,
  mlDsaLevel: MlDsaLevel = 65,
): HybridSignResult {
  const dsa = getDsa(mlDsaLevel);
  const ed25519Key = assertHex(secretKeyEd25519Hex, "secretKeyEd25519");
  const mlDsaKey = assertHex(secretKeyMlDsaHex, "secretKeyMlDsa");
  const msg = toBytes(message);

  const ed25519Sig = ed25519.sign(msg, ed25519Key);
  const mlDsaSig = dsa.sign(msg, mlDsaKey);

  return {
    ed25519Signature: Buffer.from(ed25519Sig).toString("hex"),
    mlDsaSignature: Buffer.from(mlDsaSig).toString("hex"),
    algorithm: `ed25519-ml-dsa-${mlDsaLevel}`,
  };
}

/**
 * Hybrid verify — verifies both an Ed25519 signature and an ML-DSA signature.
 * Both must be valid for the result to be valid.
 *
 * @param pubKeyEd25519Hex - Ed25519 public key (hex, 32 bytes).
 * @param pubKeyMlDsaHex - ML-DSA public key (hex).
 * @param message - Message that was signed (string or bytes).
 * @param sigEd25519Hex - Ed25519 signature (hex, 64 bytes).
 * @param sigMlDsaHex - ML-DSA signature (hex).
 * @param mlDsaLevel - ML-DSA security level (default: 65).
 */
export function hybridVerify(
  pubKeyEd25519Hex: string,
  pubKeyMlDsaHex: string,
  message: string | Uint8Array,
  sigEd25519Hex: string,
  sigMlDsaHex: string,
  mlDsaLevel: MlDsaLevel = 65,
): HybridVerifyResult {
  const dsa = getDsa(mlDsaLevel);
  const ed25519Pub = assertHex(pubKeyEd25519Hex, "pubKeyEd25519");
  const mlDsaPub = assertHex(pubKeyMlDsaHex, "pubKeyMlDsa");
  const msg = toBytes(message);
  const ed25519Sig = assertHex(sigEd25519Hex, "sigEd25519");
  const mlDsaSig = assertHex(sigMlDsaHex, "sigMlDsa");

  const ed25519Valid = ed25519.verify(ed25519Sig, msg, ed25519Pub);
  const mlDsaValid = dsa.verify(mlDsaSig, msg, mlDsaPub);

  return {
    valid: ed25519Valid && mlDsaValid,
    algorithm: `ed25519-ml-dsa-${mlDsaLevel}`,
  };
}
