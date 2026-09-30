/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Upper bounds on password-hashing and KDF work factors.
 *
 * These functions run synchronously, and their costs often come from
 * untrusted input (a request body, a PHC string, a ciphertext header). A
 * single call with an extreme cost can block the event loop for seconds
 * or exhaust memory, so every entry point checks costs before running.
 */

/** Maximum Argon2 time cost (passes). */
export const MAX_ARGON2_TIME = 10;
/** Maximum Argon2 memory cost in KiB (256 MiB). */
export const MAX_ARGON2_MEMORY = 262144;
/** Maximum Argon2 parallelism (lanes). */
export const MAX_ARGON2_PARALLELISM = 8;
/** Maximum scrypt cost parameter N (2^17, the library default). */
export const MAX_SCRYPT_N = 131072;
/** Maximum scrypt block size r. */
export const MAX_SCRYPT_R = 8;
/** Maximum scrypt parallelism p. */
export const MAX_SCRYPT_P = 4;
/** Maximum PBKDF2 iteration count. */
export const MAX_PBKDF2_ITERATIONS = 1_000_000;

/** Throw unless `value` is an integer in [min, max]. */
function checkRange(name: string, value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer ${min}–${max}, got ${value}`);
  }
}

/** Reject Argon2 costs outside the supported range. */
export function checkArgon2Costs(t: number, m: number, p: number): void {
  checkRange("Argon2 time cost", t, 1, MAX_ARGON2_TIME);
  checkRange("Argon2 parallelism", p, 1, MAX_ARGON2_PARALLELISM);
  checkRange("Argon2 memory cost (KiB)", m, 8 * p, MAX_ARGON2_MEMORY);
}

/** Reject scrypt costs outside the supported range. */
export function checkScryptCosts(N: number, r: number, p: number): void {
  checkRange("scrypt N", N, 2, MAX_SCRYPT_N);
  if ((N & (N - 1)) !== 0) {
    throw new Error(`scrypt N must be a power of two, got ${N}`);
  }
  checkRange("scrypt r", r, 1, MAX_SCRYPT_R);
  checkRange("scrypt p", p, 1, MAX_SCRYPT_P);
}

/** Reject PBKDF2 iteration counts outside the supported range. */
export function checkPbkdf2Iterations(iterations: number): void {
  checkRange("PBKDF2 iterations", iterations, 1, MAX_PBKDF2_ITERATIONS);
}
