/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file HMAC (Hash-based Message Authentication Code) via @noble/hashes.
 *
 * Supports SHA-256, SHA-384, SHA-512, SHA3-256, and SHA3-512 as underlying
 * hash functions. Uses timing-safe comparison for verification to prevent
 * timing side-channel attacks.
 */

import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { sha384, sha512 } from "@noble/hashes/sha512";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3";
import { kmac128, kmac256 } from "@noble/hashes/sha3-addons";

// --- Types ---

/** Supported HMAC hash algorithms. */
export const HMAC_ALGORITHMS = [
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
] as const;

/** Union of supported HMAC algorithm names. */
export type HmacAlgorithm = (typeof HMAC_ALGORITHMS)[number];

/** Options for computing an HMAC. */
export interface HmacComputeOptions {
  /** Hash algorithm to use. */
  algorithm: HmacAlgorithm;
  /** HMAC key (hex string or bytes). */
  key: string | Uint8Array;
  /** Data to authenticate (UTF-8 string or bytes). */
  data: string | Uint8Array;
}

/** Result of an HMAC computation. */
export interface HmacComputeResult {
  /** Hex-encoded MAC. */
  mac: string;
  /** Algorithm used. */
  algorithm: HmacAlgorithm;
}

/** Options for verifying an HMAC. */
export interface HmacVerifyOptions {
  /** Hash algorithm to use. */
  algorithm: HmacAlgorithm;
  /** HMAC key (hex string or bytes). */
  key: string | Uint8Array;
  /** Data to authenticate (UTF-8 string or bytes). */
  data: string | Uint8Array;
  /** Hex-encoded MAC to verify against. */
  mac: string;
}

/** Result of an HMAC verification. */
export interface HmacVerifyResult {
  /** Whether the MAC is valid. */
  valid: boolean;
  /** Algorithm used. */
  algorithm: HmacAlgorithm;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function toBytes(
  input: string | Uint8Array,
  encoding: "hex" | "utf8" = "utf8",
): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (encoding === "hex") {
    if (!HEX_RE.test(input)) {
      throw new Error("Invalid hex string");
    }
    return Buffer.from(input, "hex");
  }
  return Buffer.from(input, "utf8");
}

/**
 * Constant-time comparison of two byte arrays.
 * Returns true only when both arrays have the same length and contents.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] as number) ^ (b[i] as number);
  }
  return result === 0;
}

type HashFn = typeof sha256;

const hashFunctions: Record<HmacAlgorithm, HashFn> = {
  sha256: sha256,
  sha384: sha384,
  sha512: sha512,
  "sha3-256": sha3_256,
  "sha3-512": sha3_512,
};

function getHashFn(algorithm: HmacAlgorithm): HashFn {
  const fn = hashFunctions[algorithm];
  if (!fn) {
    throw new Error(
      `Unsupported HMAC algorithm: ${algorithm}. Supported: ${HMAC_ALGORITHMS.join(", ")}`,
    );
  }
  return fn;
}

// --- HMAC ---

/**
 * Compute an HMAC.
 */
export function computeHmac(options: HmacComputeOptions): HmacComputeResult {
  const hashFn = getHashFn(options.algorithm);
  const key = toBytes(options.key, "hex");
  const data = toBytes(options.data, "utf8");

  const mac = hmac(hashFn, key, data);

  return {
    mac: Buffer.from(mac).toString("hex"),
    algorithm: options.algorithm,
  };
}

/**
 * Verify an HMAC using timing-safe comparison.
 */
export function verifyHmac(options: HmacVerifyOptions): HmacVerifyResult {
  const hashFn = getHashFn(options.algorithm);
  const key = toBytes(options.key, "hex");
  const data = toBytes(options.data, "utf8");
  const expectedMac = toBytes(options.mac, "hex");

  const computedMac = hmac(hashFn, key, data);
  const valid = timingSafeEqual(computedMac, expectedMac);

  return {
    valid,
    algorithm: options.algorithm,
  };
}

// --- KMAC (Keccak-based MAC, NIST SP 800-185) ---

/** Supported KMAC algorithm variants. */
export const KMAC_ALGORITHMS = ["kmac-128", "kmac-256"] as const;

/** Union of supported KMAC algorithm names. */
export type KmacAlgorithm = (typeof KMAC_ALGORITHMS)[number];

/** Options for computing a KMAC. */
export interface KmacComputeOptions {
  /** KMAC algorithm variant. */
  algorithm: KmacAlgorithm;
  /** KMAC key (hex string or bytes). */
  key: string | Uint8Array;
  /** Data to authenticate (UTF-8 string or bytes). */
  data: string | Uint8Array;
  /** Optional customization string (UTF-8 string or bytes). */
  customization?: string | Uint8Array;
  /** Output length in bytes (default: 32 for kmac-128, 64 for kmac-256). */
  outputLength?: number;
}

/** Result of a KMAC computation. */
export interface KmacComputeResult {
  /** Hex-encoded MAC. */
  mac: string;
  /** Algorithm used. */
  algorithm: KmacAlgorithm;
}

/** Options for verifying a KMAC. */
export interface KmacVerifyOptions {
  /** KMAC algorithm variant. */
  algorithm: KmacAlgorithm;
  /** KMAC key (hex string or bytes). */
  key: string | Uint8Array;
  /** Data to authenticate (UTF-8 string or bytes). */
  data: string | Uint8Array;
  /** Hex-encoded MAC to verify against. */
  mac: string;
  /** Optional customization string (must match what was used during compute). */
  customization?: string | Uint8Array;
  /** Output length in bytes (must match what was used during compute). */
  outputLength?: number;
}

/** Result of a KMAC verification. */
export interface KmacVerifyResult {
  /** Whether the MAC is valid. */
  valid: boolean;
  /** Algorithm used. */
  algorithm: KmacAlgorithm;
}

const kmacFunctions: Record<KmacAlgorithm, typeof kmac128> = {
  "kmac-128": kmac128,
  "kmac-256": kmac256,
};

const kmacDefaultLength: Record<KmacAlgorithm, number> = {
  "kmac-128": 32,
  "kmac-256": 64,
};

/**
 * Compute a KMAC (Keccak Message Authentication Code).
 *
 * KMAC is a NIST-standardized MAC based on cSHAKE (SP 800-185).
 * It supports a customization string and variable output length.
 */
export function computeKmac(options: KmacComputeOptions): KmacComputeResult {
  const fn = kmacFunctions[options.algorithm];
  if (!fn) {
    throw new Error(
      `Unsupported KMAC algorithm: ${options.algorithm}. Supported: ${KMAC_ALGORITHMS.join(", ")}`,
    );
  }

  const key = toBytes(options.key, "hex");
  const data = toBytes(options.data, "utf8");
  const outputLength =
    options.outputLength ?? kmacDefaultLength[options.algorithm]!;

  const opts: { dkLen: number; personalization?: Uint8Array } = {
    dkLen: outputLength,
  };
  if (options.customization) {
    opts.personalization = toBytes(options.customization, "utf8");
  }

  const mac = fn(key, data, opts);

  return {
    mac: Buffer.from(mac).toString("hex"),
    algorithm: options.algorithm,
  };
}

/**
 * Verify a KMAC using timing-safe comparison.
 */
export function verifyKmac(options: KmacVerifyOptions): KmacVerifyResult {
  const fn = kmacFunctions[options.algorithm];
  if (!fn) {
    throw new Error(
      `Unsupported KMAC algorithm: ${options.algorithm}. Supported: ${KMAC_ALGORITHMS.join(", ")}`,
    );
  }

  const key = toBytes(options.key, "hex");
  const data = toBytes(options.data, "utf8");
  const expectedMac = toBytes(options.mac, "hex");
  const outputLength =
    options.outputLength ?? kmacDefaultLength[options.algorithm]!;

  const verifyOpts: { dkLen: number; personalization?: Uint8Array } = {
    dkLen: outputLength,
  };
  if (options.customization) {
    verifyOpts.personalization = toBytes(options.customization, "utf8");
  }

  const computedMac = fn(key, data, verifyOpts);
  const valid = timingSafeEqual(computedMac, expectedMac);

  return {
    valid,
    algorithm: options.algorithm,
  };
}
