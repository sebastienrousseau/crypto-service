/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks ML-DSA (FIPS 204) digital signatures — all three parameter sets + hybrid signing.
 *
 * Implements ML-DSA-44, ML-DSA-65, and ML-DSA-87 for quantum-resistant digital
 * signatures, plus a hybrid scheme combining Ed25519 (classical) + ML-DSA (post-quantum).
 *
 * The hybrid approach produces dual signatures, both of which must verify:
 * - If quantum computers arrive: Ed25519 breaks but ML-DSA protects
 * - If ML-DSA has a flaw: Ed25519 still provides classical security
 *
 * Hybrid signatures are Composite ML-DSA (draft-ietf-lamps-pq-composite-sigs-19)
 * id-MLDSA44-Ed25519-SHA512 and id-MLDSA65-Ed25519-SHA512: both halves sign
 * M' = Prefix || Label || len(ctx) || ctx || SHA-512(M), the ML-DSA half
 * with the Label as its context, so neither half is a signature over M on
 * its own.
 */

import { ml_dsa44, ml_dsa65, ml_dsa87 } from "../accel/pq-backend";
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha512 } from "@noble/hashes/sha2.js";

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
  /** Hex-encoded Ed25519 signature over M'. */
  ed25519Signature: string;
  /** Hex-encoded ML-DSA signature over M'. */
  mlDsaSignature: string;
  /**
   * Hex-encoded composite signature value, ML-DSA signature then Ed25519
   * signature, as the composite draft serializes it.
   */
  signature: string;
  /** Algorithm identifier. */
  algorithm: string;
}

/** Options for hybrid signing. */
export interface HybridSignOptions {
  /** Application context bound into M', at most 255 bytes (default empty). */
  context?: string | Uint8Array;
}

/** Options for hybrid verification. */
export interface HybridVerifyOptions extends HybridSignOptions {
  /**
   * Also accept a signature made before 0.0.36, whose halves each signed
   * the raw message. Such a signature binds nothing together; accept it
   * only while re-signing old data.
   */
  acceptLegacy?: boolean;
}

/** Result of an Ed25519 + ML-DSA hybrid verification. */
export interface HybridVerifyResult {
  /** Whether both signatures are valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: string;
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

/** Convert a string or Uint8Array to UTF-8 bytes. */
function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Buffer.from(input, "utf8");
}

/** Retrieve the ML-DSA implementation for the given security level. */
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

/** Build the ML-DSA algorithm identifier string from a security level. */
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

// --- Hybrid Ed25519 + ML-DSA (Composite ML-DSA) ---

/** Composite ML-DSA's prefix, "CompositeAlgorithmSignatures2025". */
const COMPOSITE_PREFIX = new TextEncoder().encode(
  "CompositeAlgorithmSignatures2025",
);

/** Composite ML-DSA labels for the Ed25519 composites the draft defines. */
const COMPOSITE_LABELS: Partial<Record<MlDsaLevel, Uint8Array>> = {
  44: new TextEncoder().encode("COMPSIG-MLDSA44-Ed25519-SHA512"),
  65: new TextEncoder().encode("COMPSIG-MLDSA65-Ed25519-SHA512"),
};

/** The label for `level`; Composite ML-DSA pairs ML-DSA-87 with Ed448. */
function compositeLabel(level: MlDsaLevel): Uint8Array {
  const label = COMPOSITE_LABELS[level];
  if (!label) {
    throw new Error(
      "Composite ML-DSA defines no ML-DSA-87 + Ed25519 algorithm; use ML-DSA-44 or ML-DSA-65",
    );
  }
  return label;
}

/** M' = Prefix || Label || len(ctx) || ctx || SHA-512(M). */
function messageRepresentative(
  label: Uint8Array,
  message: Uint8Array,
  context: string | Uint8Array | undefined,
): Uint8Array {
  const ctx = toBytes(context ?? new Uint8Array(0));
  if (ctx.length > 255) {
    throw new Error("Hybrid signature context must be at most 255 bytes");
  }
  return Uint8Array.from(
    Buffer.concat([
      COMPOSITE_PREFIX,
      label,
      new Uint8Array([ctx.length]),
      ctx,
      sha512(message),
    ]),
  );
}

/**
 * Hybrid sign: Composite ML-DSA with Ed25519 (ML-DSA-44 or ML-DSA-65).
 * Both halves sign M', so neither is a signature over the message alone.
 *
 * @param secretKeyEd25519Hex - Ed25519 secret key (hex, 32 bytes).
 * @param secretKeyMlDsaHex - ML-DSA secret key (hex).
 * @param message - Message to sign (string or bytes).
 * @param mlDsaLevel - ML-DSA security level, 44 or 65 (default: 65).
 * @param options - Optional application context.
 */
export function hybridSign(
  secretKeyEd25519Hex: string,
  secretKeyMlDsaHex: string,
  message: string | Uint8Array,
  mlDsaLevel: MlDsaLevel = 65,
  options: HybridSignOptions = {},
): HybridSignResult {
  const label = compositeLabel(mlDsaLevel);
  const dsa = getDsa(mlDsaLevel);
  const ed25519Key = assertHex(secretKeyEd25519Hex, "secretKeyEd25519");
  const mlDsaKey = assertHex(secretKeyMlDsaHex, "secretKeyMlDsa");
  const mPrime = messageRepresentative(
    label,
    toBytes(message),
    options.context,
  );

  const mlDsaSig = dsa.sign(mPrime, mlDsaKey, { context: label });
  const ed25519Sig = ed25519.sign(mPrime, ed25519Key);
  const mlDsaHex = Buffer.from(mlDsaSig).toString("hex");
  const ed25519Hex = Buffer.from(ed25519Sig).toString("hex");

  return {
    ed25519Signature: ed25519Hex,
    mlDsaSignature: mlDsaHex,
    signature: mlDsaHex + ed25519Hex,
    algorithm: `ed25519-ml-dsa-${mlDsaLevel}`,
  };
}

/**
 * Hybrid verify: both halves must verify over M' (Composite ML-DSA). With
 * `acceptLegacy`, a pre-0.0.36 signature whose halves signed the raw
 * message also verifies.
 *
 * @param pubKeyEd25519Hex - Ed25519 public key (hex, 32 bytes).
 * @param pubKeyMlDsaHex - ML-DSA public key (hex).
 * @param message - Message that was signed (string or bytes).
 * @param sigEd25519Hex - Ed25519 signature (hex, 64 bytes).
 * @param sigMlDsaHex - ML-DSA signature (hex).
 * @param mlDsaLevel - ML-DSA security level (default: 65).
 * @param options - Application context, and whether to accept the old form.
 */
export function hybridVerify(
  pubKeyEd25519Hex: string,
  pubKeyMlDsaHex: string,
  message: string | Uint8Array,
  sigEd25519Hex: string,
  sigMlDsaHex: string,
  mlDsaLevel: MlDsaLevel = 65,
  options: HybridVerifyOptions = {},
): HybridVerifyResult {
  const dsa = getDsa(mlDsaLevel);
  const ed25519Pub = assertHex(pubKeyEd25519Hex, "pubKeyEd25519");
  const mlDsaPub = assertHex(pubKeyMlDsaHex, "pubKeyMlDsa");
  const msg = toBytes(message);
  const ed25519Sig = assertHex(sigEd25519Hex, "sigEd25519");
  const mlDsaSig = assertHex(sigMlDsaHex, "sigMlDsa");
  const both = (signed: Uint8Array, mlDsaOpts?: { context: Uint8Array }) =>
    ed25519.verify(ed25519Sig, signed, ed25519Pub, { zip215: false }) &&
    dsa.verify(mlDsaSig, signed, mlDsaPub, mlDsaOpts);

  const legacy = options.acceptLegacy === true && both(msg);
  if (legacy || (options.acceptLegacy && !COMPOSITE_LABELS[mlDsaLevel])) {
    return { valid: legacy, algorithm: `ed25519-ml-dsa-${mlDsaLevel}` };
  }
  const label = compositeLabel(mlDsaLevel);
  const mPrime = messageRepresentative(label, msg, options.context);
  return {
    valid: both(mPrime, { context: label }),
    algorithm: `ed25519-ml-dsa-${mlDsaLevel}`,
  };
}
