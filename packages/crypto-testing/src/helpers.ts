// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Test assertion helpers for crypto operations.
 *
 * These helpers integrate with crypto-lib's real APIs to provide
 * one-line assertions for common crypto test patterns.
 */

import { crypto, type SignAlgorithm } from "@sebastienrousseau/crypto-lib";

// ---------------------------------------------------------------------------
// Hex validation
// ---------------------------------------------------------------------------

/** Regular expression matching a hexadecimal string. */
const HEX_RE = /^[0-9a-fA-F]+$/;

/**
 * Assert that `value` is a valid hex-encoded string.
 *
 * @example
 * ```ts
 * import { expectValidHex } from "@sebastienrousseau/crypto-testing";
 *
 * expectValidHex("deadbeef");       // passes
 * expectValidHex("deadbeef", 4);    // passes (4 bytes = 8 hex chars)
 * ```
 *
 * @param value  - The string to validate.
 * @param length - Expected byte length (hex chars / 2). If provided,
 *                 the hex string must encode exactly this many bytes.
 * @throws {Error} If the value is not valid hex or the wrong length.
 */
export function expectValidHex(value: string, length?: number): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected a non-empty hex string");
  }
  if (value.length % 2 !== 0) {
    throw new Error(
      `Hex string has odd length (${value.length}); must be even`,
    );
  }
  if (!HEX_RE.test(value)) {
    throw new Error(
      `String is not valid hexadecimal: "${value.slice(0, 20)}..."`,
    );
  }
  if (length !== undefined) {
    const byteLen = value.length / 2;
    if (byteLen !== length) {
      throw new Error(
        `Expected ${length} bytes (${length * 2} hex chars), got ${byteLen} bytes (${value.length} hex chars)`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Base64 validation
// ---------------------------------------------------------------------------

/** Regular expression matching a Base64-encoded string. */
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Assert that `value` is a valid Base64-encoded string.
 *
 * @example
 * ```ts
 * import { expectValidBase64 } from "@sebastienrousseau/crypto-testing";
 *
 * expectValidBase64("SGVsbG8="); // passes
 * ```
 *
 * @param value - The string to validate.
 * @throws {Error} If the value is not valid Base64.
 */
export function expectValidBase64(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected a non-empty Base64 string");
  }
  if (!BASE64_RE.test(value)) {
    throw new Error(`String is not valid Base64: "${value.slice(0, 20)}..."`);
  }
  // Verify round-trip
  const buf = Buffer.from(value, "base64");
  if (buf.toString("base64") !== value) {
    throw new Error("Base64 string does not survive round-trip decode/encode");
  }
}

// ---------------------------------------------------------------------------
// Key pair validation
// ---------------------------------------------------------------------------

/**
 * Minimal key-pair shape accepted by {@link expectKeyPair}.
 *
 * @example
 * ```ts
 * import type { MinimalKeyPair } from "@sebastienrousseau/crypto-testing";
 *
 * const kp: MinimalKeyPair = { publicKey: "aa".repeat(32), privateKey: "bb".repeat(32) };
 * ```
 */
export interface MinimalKeyPair {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
  /** Algorithm identifier (e.g. `"ed25519"`). */
  algorithm?: string;
}

/**
 * Assert that `kp` looks like a valid key pair.
 *
 * Checks that both `publicKey` and `privateKey` are non-empty hex
 * strings and that the public key is different from the private key.
 *
 * @example
 * ```ts
 * import { expectKeyPair, mockGenerateKeyPair } from "@sebastienrousseau/crypto-testing";
 *
 * const kp = mockGenerateKeyPair("ed25519");
 * expectKeyPair(kp); // throws if invalid
 * ```
 *
 * @param kp - Key pair to validate.
 * @throws {Error} If validation fails.
 */
export function expectKeyPair(kp: MinimalKeyPair): void {
  if (!kp || typeof kp !== "object") {
    throw new Error("Expected a key pair object");
  }
  expectValidHex(kp.publicKey);
  expectValidHex(kp.privateKey);
  if (kp.publicKey === kp.privateKey) {
    throw new Error("Public key and private key must not be identical");
  }
}

// ---------------------------------------------------------------------------
// Encrypt/decrypt round-trip
// ---------------------------------------------------------------------------

/**
 * Assert that encrypting then decrypting `plaintext` with `key`
 * produces the original data. Uses crypto-lib's secretbox (XChaCha20).
 *
 * @example
 * ```ts
 * import { expectEncryptDecryptRoundTrip, TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * expectEncryptDecryptRoundTrip(TEST_KEYS.aes256, "hello world");
 * ```
 *
 * @param key       - Hex-encoded 256-bit key.
 * @param plaintext - Data to round-trip.
 * @throws {Error} If the decrypted output does not match the input.
 */
export function expectEncryptDecryptRoundTrip(
  key: string,
  plaintext: string,
): void {
  const sealed = crypto.encrypt(key, plaintext);
  const decrypted = crypto.decrypt(key, sealed);
  const result = Buffer.from(decrypted).toString("utf8");
  if (result !== plaintext) {
    throw new Error(
      `Round-trip failed: expected "${plaintext}", got "${result}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Sign/verify round-trip
// ---------------------------------------------------------------------------

/**
 * Assert that a full sign-then-verify round-trip succeeds for the
 * given algorithm. Generates a fresh key pair, signs the test vector
 * plaintext, and verifies the signature.
 *
 * @example
 * ```ts
 * import { expectSignVerifyRoundTrip } from "@sebastienrousseau/crypto-testing";
 *
 * expectSignVerifyRoundTrip("ed25519");
 * expectSignVerifyRoundTrip("ecdsa-p256");
 * ```
 *
 * @param algorithm - Signing algorithm (e.g. `"ed25519"`, `"ecdsa-p256"`).
 * @throws {Error} If signing or verification fails.
 */
export function expectSignVerifyRoundTrip(algorithm: SignAlgorithm): void {
  // Map SignAlgorithm to the KeyAlgorithm expected by generateKeyPair
  const keyAlgorithmMap: Record<string, string> = {
    ed25519: "ed25519",
    ed448: "ed448",
    "ecdsa-p256": "p256",
    "ecdsa-p384": "p384",
    schnorr: "ed25519", // Schnorr uses secp256k1 but keygen is separate
    "ml-dsa-44": "ml-dsa-44",
    "ml-dsa-65": "ml-dsa-65",
    "ml-dsa-87": "ml-dsa-87",
  };

  const keyAlg = keyAlgorithmMap[algorithm];
  if (!keyAlg) {
    throw new Error(
      `No key algorithm mapping for sign algorithm "${algorithm}"`,
    );
  }

  const kp = crypto.generateKeyPair(keyAlg as never);
  const message = "crypto-testing round-trip verification";

  const signature = crypto.sign(algorithm, kp.privateKey, message);
  expectValidHex(signature);

  const valid = crypto.verify(algorithm, kp.publicKey, message, signature);
  if (!valid) {
    throw new Error(
      `Sign/verify round-trip failed for algorithm "${algorithm}"`,
    );
  }
}
