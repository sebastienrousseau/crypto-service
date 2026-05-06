/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file SLH-DSA (FIPS 205) — Stateless Hash-Based Digital Signatures.
 *
 * Implements all 12 SLH-DSA variants (SHA2/SHAKE x 128/192/256 x fast/small).
 * SLH-DSA (formerly SPHINCS+) provides post-quantum security based solely on
 * hash function security — no lattice or algebraic assumptions required.
 *
 * Trade-offs:
 * - "f" (fast) variants: faster signing, larger signatures
 * - "s" (small) variants: slower signing, smaller signatures
 * - SHA2 variants: typically faster on hardware with SHA extensions
 * - SHAKE variants: more conservative security assumption
 */

import {
  slh_dsa_sha2_128f,
  slh_dsa_sha2_128s,
  slh_dsa_sha2_192f,
  slh_dsa_sha2_192s,
  slh_dsa_sha2_256f,
  slh_dsa_sha2_256s,
  slh_dsa_shake_128f,
  slh_dsa_shake_128s,
  slh_dsa_shake_192f,
  slh_dsa_shake_192s,
  slh_dsa_shake_256f,
  slh_dsa_shake_256s,
} from "@noble/post-quantum/slh-dsa.js";

// --- Types ---

/** SLH-DSA variant (hash function x security level x speed/size trade-off). */
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

/** SLH-DSA key pair (public + secret keys). */
export interface SlhDsaKeyPairResult {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded secret key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: string;
}

/** Result of an SLH-DSA signing operation. */
export interface SlhDsaSignResult {
  /** Hex-encoded signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: string;
}

/** Result of an SLH-DSA signature verification. */
export interface SlhDsaVerifyResult {
  /** Whether the signature is valid. */
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

const SLH_DSA_VARIANTS: Record<SlhDsaVariant, typeof slh_dsa_sha2_128f> = {
  "sha2-128f": slh_dsa_sha2_128f,
  "sha2-128s": slh_dsa_sha2_128s,
  "sha2-192f": slh_dsa_sha2_192f,
  "sha2-192s": slh_dsa_sha2_192s,
  "sha2-256f": slh_dsa_sha2_256f,
  "sha2-256s": slh_dsa_sha2_256s,
  "shake-128f": slh_dsa_shake_128f,
  "shake-128s": slh_dsa_shake_128s,
  "shake-192f": slh_dsa_shake_192f,
  "shake-192s": slh_dsa_shake_192s,
  "shake-256f": slh_dsa_shake_256f,
  "shake-256s": slh_dsa_shake_256s,
};

function getVariant(variant: SlhDsaVariant) {
  const impl = SLH_DSA_VARIANTS[variant];
  if (!impl) {
    throw new Error(
      `Unsupported SLH-DSA variant: ${variant}. Supported: ${Object.keys(SLH_DSA_VARIANTS).join(", ")}`,
    );
  }
  return impl;
}

function algorithmName(variant: SlhDsaVariant): string {
  return `slh-dsa-${variant}`;
}

// --- SLH-DSA ---

/**
 * Generate an SLH-DSA key pair for the specified variant.
 */
export function slhDsaKeygen(variant: SlhDsaVariant): SlhDsaKeyPairResult {
  const dsa = getVariant(variant);
  const { publicKey, secretKey } = dsa.keygen();
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    algorithm: algorithmName(variant),
  };
}

/**
 * Sign a message with SLH-DSA.
 */
export function slhDsaSign(
  variant: SlhDsaVariant,
  secretKeyHex: string,
  message: string | Uint8Array,
): SlhDsaSignResult {
  const dsa = getVariant(variant);
  const secretKey = assertHex(secretKeyHex, "secretKey");
  const msg = toBytes(message);
  const signature = dsa.sign(msg, secretKey);
  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: algorithmName(variant),
  };
}

/**
 * Verify an SLH-DSA signature.
 */
export function slhDsaVerify(
  variant: SlhDsaVariant,
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): SlhDsaVerifyResult {
  const dsa = getVariant(variant);
  const publicKey = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const signature = assertHex(signatureHex, "signature");
  const valid = dsa.verify(signature, msg, publicKey);
  return {
    valid,
    algorithm: algorithmName(variant),
  };
}
