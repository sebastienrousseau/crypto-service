/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Argon2 password hashing via @noble/hashes.
 *
 * Argon2id (RFC 9106) is the recommended algorithm for password hashing:
 * - Memory-hard: resists GPU/ASIC brute-force attacks
 * - Combines Argon2i (side-channel resistant) and Argon2d (GPU resistant)
 * - Winner of the Password Hashing Competition (2015)
 *
 * Also exposes Argon2i and Argon2d variants for specialized use cases.
 *
 * Default parameters: t=3 (time cost), m=65536 (64 MB), p=4 (parallelism).
 * These match the OWASP recommendations for server-side password hashing.
 */

import { argon2id, argon2i, argon2d } from "@noble/hashes/argon2.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { timingSafeEqual } from "../utils";

// --- Types ---

/** Argon2 algorithm variant (id, i, or d). */
export type Argon2Variant = "argon2id" | "argon2i" | "argon2d";

/** Argon2 cost parameters (time, memory, parallelism). */
export interface Argon2Params {
  /** Time cost (iterations). */
  t: number;
  /** Memory cost in KiB. */
  m: number;
  /** Parallelism (lanes). */
  p: number;
}

/** Options for hashing a password with Argon2. */
export interface HashPasswordOptions {
  /** Password to hash (UTF-8 string or bytes). */
  password: string | Uint8Array;
  /** Salt (hex string or bytes). If omitted, a random 16-byte salt is generated. */
  salt?: string | Uint8Array;
  /** Time cost (iterations). Default: 3. */
  timeCost?: number;
  /** Memory cost in KiB. Default: 65536 (64 MB). */
  memoryCost?: number;
  /** Parallelism (lanes). Default: 4. */
  parallelism?: number;
  /** Output hash length in bytes. Default: 32. */
  hashLength?: number;
  /** Argon2 variant. Default: argon2id. */
  variant?: Argon2Variant;
}

/** Result of an Argon2 password hash operation. */
export interface HashPasswordResult {
  /** Hex-encoded hash. */
  hash: string;
  /** Hex-encoded salt used. */
  salt: string;
  /** Parameters used. */
  params: Argon2Params;
  /** Algorithm identifier. */
  algorithm: Argon2Variant;
  /** PHC string format ($argon2id$v=19$m=65536,t=3,p=4$salt$hash). */
  phc: string;
}

/** Options for verifying a password against an Argon2 hash. */
export interface VerifyPasswordOptions {
  /** Password to verify (UTF-8 string or bytes). */
  password: string | Uint8Array;
  /** Hex-encoded hash to verify against. */
  hash: string;
  /** Hex-encoded salt. */
  salt: string;
  /** Parameters used during hashing. */
  params: Argon2Params;
  /** Argon2 variant used. Default: argon2id. */
  variant?: Argon2Variant;
}

/** Result of an Argon2 password verification. */
export interface VerifyPasswordResult {
  /** Whether the password matches the hash. */
  valid: boolean;
}

/** Options for verifying a password against a PHC-format string. */
export interface VerifyPhcOptions {
  /** Password to verify. */
  password: string | Uint8Array;
  /** PHC-format string to verify against. */
  phc: string;
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

function getArgon2Fn(variant: Argon2Variant) {
  switch (variant) {
    case "argon2id":
      return argon2id;
    case "argon2i":
      return argon2i;
    case "argon2d":
      return argon2d;
    default:
      throw new Error(
        `Unsupported Argon2 variant: ${variant}. Supported: argon2id, argon2i, argon2d`,
      );
  }
}

function toPhcString(
  variant: Argon2Variant,
  params: Argon2Params,
  salt: Uint8Array,
  hash: Uint8Array,
): string {
  const saltB64 = Buffer.from(salt).toString("base64").replace(/=+$/, "");
  const hashB64 = Buffer.from(hash).toString("base64").replace(/=+$/, "");
  return `$${variant}$v=19$m=${params.m},t=${params.t},p=${params.p}$${saltB64}$${hashB64}`;
}

function parsePhcString(phc: string): {
  variant: Argon2Variant;
  params: Argon2Params;
  salt: Uint8Array;
  hash: Uint8Array;
} {
  const parts = phc.split("$").filter(Boolean);
  if (parts.length < 5) {
    throw new Error("Invalid PHC string format");
  }
  const variant = parts[0] as Argon2Variant;
  if (!["argon2id", "argon2i", "argon2d"].includes(variant)) {
    throw new Error(`Unsupported variant in PHC string: ${variant}`);
  }
  // parts[1] = "v=19"
  const paramStr = parts[2];
  const paramParts = paramStr.split(",");
  const paramMap: Record<string, number> = {};
  for (const p of paramParts) {
    const [k, v] = p.split("=");
    paramMap[k] = parseInt(v, 10);
  }
  const params: Argon2Params = {
    m: paramMap["m"],
    t: paramMap["t"],
    p: paramMap["p"],
  };
  const salt = Buffer.from(parts[3], "base64");
  const hash = Buffer.from(parts[4], "base64");
  return { variant, params, salt, hash };
}

// --- Default parameters ---

const DEFAULT_TIME_COST = 3;
const DEFAULT_MEMORY_COST = 65536; // 64 MB
const DEFAULT_PARALLELISM = 4;
const DEFAULT_HASH_LENGTH = 32;
const DEFAULT_SALT_LENGTH = 16;

// --- Argon2 ---

/**
 * Hash a password using Argon2 (default: Argon2id).
 */
export function hashPassword(options: HashPasswordOptions): HashPasswordResult {
  const variant = options.variant ?? "argon2id";
  const argon2Fn = getArgon2Fn(variant);
  const password = toBytes(options.password, "utf8");
  const salt = options.salt
    ? toBytes(options.salt, "hex")
    : randomBytes(DEFAULT_SALT_LENGTH);
  const t = options.timeCost ?? DEFAULT_TIME_COST;
  const m = options.memoryCost ?? DEFAULT_MEMORY_COST;
  const p = options.parallelism ?? DEFAULT_PARALLELISM;
  const dkLen = options.hashLength ?? DEFAULT_HASH_LENGTH;

  const hash = argon2Fn(password, salt, { t, m, p, dkLen });
  const params: Argon2Params = { t, m, p };

  return {
    hash: Buffer.from(hash).toString("hex"),
    salt: Buffer.from(salt).toString("hex"),
    params,
    algorithm: variant,
    phc: toPhcString(variant, params, salt, hash),
  };
}

/**
 * Verify a password against an Argon2 hash.
 */
export function verifyPassword(
  options: VerifyPasswordOptions,
): VerifyPasswordResult {
  const variant = options.variant ?? "argon2id";
  const argon2Fn = getArgon2Fn(variant);
  const password = toBytes(options.password, "utf8");
  const salt = toBytes(options.salt, "hex");
  const expectedHash = toBytes(options.hash, "hex");
  const { t, m, p } = options.params;
  const dkLen = expectedHash.length;

  const computedHash = argon2Fn(password, salt, { t, m, p, dkLen });
  const valid = timingSafeEqual(computedHash, expectedHash);

  return { valid };
}

/**
 * Verify a password against a PHC-format hash string.
 *
 * @example
 * ```ts
 * const result = hashPassword({ password: 'secret' });
 * const { valid } = verifyPasswordPhc({ password: 'secret', phc: result.phc });
 * ```
 */
export function verifyPasswordPhc(
  options: VerifyPhcOptions,
): VerifyPasswordResult {
  const { variant, params, salt, hash } = parsePhcString(options.phc);
  const argon2Fn = getArgon2Fn(variant);
  const password = toBytes(options.password, "utf8");
  const dkLen = hash.length;

  const computedHash = argon2Fn(password, salt, {
    t: params.t,
    m: params.m,
    p: params.p,
    dkLen,
  });
  const valid = timingSafeEqual(computedHash, hash);

  return { valid };
}
