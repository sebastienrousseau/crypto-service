/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Threshold Cryptography — Shamir Secret Sharing + Feldman VSS.
 *
 * Implements:
 * - Shamir's Secret Sharing over GF(p) where p is the Ed25519 group order
 * - Feldman Verifiable Secret Sharing (VSS) using Ed25519 base point
 *
 * The field order is the Ed25519 scalar field:
 *   p = 2^252 + 27742317777372353535851937790883648493
 *
 * This allows threshold schemes to integrate naturally with Ed25519
 * signature schemes and other protocols using the same group.
 */

import { ed25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/ciphers/webcrypto";

// --- Types ---

export interface Share {
  /** Share index (1-based, never 0). */
  index: number;
  /** Hex-encoded share value (32 bytes, a scalar in GF(p)). */
  value: string;
}

export interface SplitResult {
  /** Array of n shares; any `threshold` of them can reconstruct the secret. */
  shares: Share[];
  /** Threshold (minimum shares needed). */
  threshold: number;
  /** Algorithm identifier. */
  algorithm: "shamir-ed25519";
}

export interface FeldmanCommitments {
  /** Hex-encoded commitment points (Ed25519 points), one per coefficient. */
  commitments: string[];
  /** Algorithm identifier. */
  algorithm: "feldman-vss-ed25519";
}

// --- Constants ---

/**
 * Ed25519 group order (scalar field).
 * p = 2^252 + 27742317777372353535851937790883648493
 */
const P = BigInt(
  "7237005577332262213973186563042994240857116359379907606001950938285454250989",
);

const HEX_RE = /^[0-9a-fA-F]*$/;

// --- Helpers ---

function hexToBytes(hex: string, label: string): Uint8Array {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(hex, "hex");
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * Convert a bigint to a 32-byte hex string (little-endian for Ed25519 compat).
 */
function scalarToHex(scalar: bigint): string {
  // Store as big-endian 32-byte hex
  const hex = scalar.toString(16).padStart(64, "0");
  return hex;
}

/**
 * Convert a hex string to a bigint (big-endian).
 */
function hexToScalar(hex: string): bigint {
  if (!HEX_RE.test(hex)) {
    throw new Error("Invalid hex string");
  }
  return BigInt("0x" + hex);
}

/**
 * Generate a random scalar in [1, P-1].
 */
function randomFieldElement(): bigint {
  // Generate extra bytes to reduce bias
  const raw = randomBytes(48);
  let value = BigInt(0);
  for (let i = 0; i < raw.length; i++) {
    value = (value * BigInt(256) + BigInt(raw[i])) % P;
  }
  if (value === BigInt(0)) value = BigInt(1);
  return value;
}

/**
 * Modular arithmetic in GF(p).
 */
function mod(a: bigint, m: bigint = P): bigint {
  return ((a % m) + m) % m;
}

function modAdd(a: bigint, b: bigint): bigint {
  return mod(a + b);
}

function modMul(a: bigint, b: bigint): bigint {
  return mod(a * b);
}

function modSub(a: bigint, b: bigint): bigint {
  return mod(a - b);
}

/**
 * Modular inverse using Fermat's little theorem: a^(p-2) mod p.
 */
function modInverse(a: bigint): bigint {
  return modPow(a, P - BigInt(2));
}

/**
 * Modular exponentiation via binary method.
 */
function modPow(base: bigint, exp: bigint): bigint {
  let result = BigInt(1);
  base = mod(base);
  while (exp > BigInt(0)) {
    if (exp & BigInt(1)) {
      result = modMul(result, base);
    }
    exp >>= BigInt(1);
    base = modMul(base, base);
  }
  return result;
}

/**
 * Evaluate a polynomial at point x in GF(p).
 * coefficients[0] is the constant term (the secret).
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = BigInt(0);
  let power = BigInt(1);
  for (const coeff of coefficients) {
    result = modAdd(result, modMul(coeff, power));
    power = modMul(power, x);
  }
  return result;
}

// --- Shamir Secret Sharing ---

/**
 * Split a secret into `n` shares with a reconstruction threshold of `threshold`.
 *
 * Uses Shamir's Secret Sharing over GF(p) where p is the Ed25519 group order.
 * The secret is the constant term of a random polynomial of degree (threshold - 1).
 *
 * @param secret - Hex-encoded 32-byte secret (interpreted as a scalar in GF(p)).
 * @param n - Total number of shares to generate (must be >= threshold).
 * @param threshold - Minimum shares required for reconstruction (must be >= 2).
 */
export function splitSecret(
  secret: string,
  n: number,
  threshold: number,
): SplitResult {
  if (threshold < 2) {
    throw new Error("Threshold must be at least 2");
  }
  if (n < threshold) {
    throw new Error("Number of shares must be >= threshold");
  }
  if (n > 255) {
    throw new Error("Maximum 255 shares supported");
  }

  const secretScalar = mod(hexToScalar(secret));

  // Generate random polynomial: coefficients[0] = secret, rest random
  const coefficients: bigint[] = [secretScalar];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomFieldElement());
  }

  // Evaluate polynomial at x = 1, 2, ..., n
  const shares: Share[] = [];
  for (let i = 1; i <= n; i++) {
    const x = BigInt(i);
    const y = evaluatePolynomial(coefficients, x);
    shares.push({
      index: i,
      value: scalarToHex(y),
    });
  }

  return {
    shares,
    threshold,
    algorithm: "shamir-ed25519",
  };
}

/**
 * Reconstruct a secret from a set of shares using Lagrange interpolation.
 *
 * @param shares - Array of shares (must have at least `threshold` shares).
 * @returns Hex-encoded 32-byte reconstructed secret.
 */
export function combineShares(shares: Share[]): string {
  if (shares.length < 2) {
    throw new Error("Need at least 2 shares to reconstruct");
  }

  // Check for duplicate indices
  const indices = new Set(shares.map((s) => s.index));
  if (indices.size !== shares.length) {
    throw new Error("Duplicate share indices detected");
  }

  // Lagrange interpolation at x = 0
  let secret = BigInt(0);
  for (let i = 0; i < shares.length; i++) {
    const xi = BigInt(shares[i].index);
    const yi = hexToScalar(shares[i].value);

    // Compute Lagrange basis polynomial L_i(0)
    let numerator = BigInt(1);
    let denominator = BigInt(1);
    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue;
      const xj = BigInt(shares[j].index);
      // L_i(0) = product of (0 - xj) / (xi - xj) for j != i
      numerator = modMul(numerator, mod(-xj));
      denominator = modMul(denominator, modSub(xi, xj));
    }

    const lagrangeCoeff = modMul(numerator, modInverse(denominator));
    secret = modAdd(secret, modMul(yi, lagrangeCoeff));
  }

  return scalarToHex(secret);
}

// --- Feldman Verifiable Secret Sharing ---

/**
 * Generate Feldman VSS commitments for a set of polynomial coefficients.
 *
 * Each commitment is C_i = coefficients[i] * G where G is the Ed25519 base point.
 * These commitments allow share holders to verify their shares without
 * revealing the polynomial (and thus the secret).
 *
 * @param coefficients - Hex-encoded polynomial coefficients (first is the secret).
 */
export function generateFeldmanCommitments(
  coefficients: string[],
): FeldmanCommitments {
  if (coefficients.length < 2) {
    throw new Error("Need at least 2 coefficients (threshold >= 2)");
  }

  const commitments: string[] = [];
  for (const coeff of coefficients) {
    const scalar = hexToScalar(coeff);
    // Commitment = scalar * G (Ed25519 base point)
    const point = ed25519.ExtendedPoint.BASE.multiply(mod(scalar));
    commitments.push(bytesToHex(point.toRawBytes()));
  }

  return {
    commitments,
    algorithm: "feldman-vss-ed25519",
  };
}

/**
 * Verify a Feldman VSS share against the published commitments.
 *
 * Checks that: share.value * G == C_0 * C_1^i * C_2^(i^2) * ... * C_t^(i^t)
 * where i = share.index and C_k are the commitments.
 *
 * @param share - The share to verify.
 * @param commitments - Feldman commitments (from generateFeldmanCommitments).
 * @returns true if the share is valid.
 */
export function verifyFeldmanShare(
  share: Share,
  commitments: FeldmanCommitments,
): boolean {
  const { index, value } = share;
  const shareScalar = hexToScalar(value);

  // LHS: share_value * G
  const lhs = ed25519.ExtendedPoint.BASE.multiply(mod(shareScalar));

  // RHS: product of C_k^(index^k) for k = 0..t-1
  const x = BigInt(index);
  let rhs = ed25519.ExtendedPoint.ZERO;
  let power = BigInt(1); // x^k

  for (const commitHex of commitments.commitments) {
    const commitPoint = ed25519.ExtendedPoint.fromHex(
      hexToBytes(commitHex, "commitment"),
    );
    // Add C_k * x^k
    const term = commitPoint.multiply(power);
    rhs = rhs.add(term);
    power = modMul(power, x);
  }

  // Compare points
  return lhs.equals(rhs);
}

/**
 * Helper: split a secret and generate Feldman commitments in one step.
 *
 * @param secret - Hex-encoded 32-byte secret.
 * @param n - Total number of shares.
 * @param threshold - Minimum shares for reconstruction.
 * @returns Shares and commitments for verifiable secret sharing.
 */
export function splitSecretWithCommitments(
  secret: string,
  n: number,
  threshold: number,
): { shares: Share[]; commitments: FeldmanCommitments; threshold: number } {
  if (threshold < 2) {
    throw new Error("Threshold must be at least 2");
  }
  if (n < threshold) {
    throw new Error("Number of shares must be >= threshold");
  }
  if (n > 255) {
    throw new Error("Maximum 255 shares supported");
  }

  const secretScalar = mod(hexToScalar(secret));

  // Generate random polynomial
  const coefficients: bigint[] = [secretScalar];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomFieldElement());
  }

  // Generate shares
  const shares: Share[] = [];
  for (let i = 1; i <= n; i++) {
    const x = BigInt(i);
    const y = evaluatePolynomial(coefficients, x);
    shares.push({
      index: i,
      value: scalarToHex(y),
    });
  }

  // Generate Feldman commitments
  const coeffHexes = coefficients.map(scalarToHex);
  const commitments = generateFeldmanCommitments(coeffHexes);

  return { shares, commitments, threshold };
}
