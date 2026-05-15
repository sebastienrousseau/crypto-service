// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Fast mock versions of expensive crypto operations.
 *
 * These mocks are NOT cryptographically secure. They are designed to be
 * deterministic and fast so that unit tests that depend on crypto-lib
 * interfaces can run in milliseconds instead of seconds.
 */

import { TEST_KEYS } from "./keys";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** XOR-based "encryption" for fast fake round-trips. NOT secure. */
function xorCipher(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

/** Convert a string or Uint8Array to bytes. */
function toBytes(input: string | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : Buffer.from(input, "utf8");
}

/** Convert a Uint8Array to a lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Decode a hex string into a Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  return Buffer.from(hex, "hex");
}

// ---------------------------------------------------------------------------
// Mock password hashing
// ---------------------------------------------------------------------------

/**
 * Result from {@link mockHashPassword}.
 *
 * @example
 * ```ts
 * import type { MockHashPasswordResult } from "@sebastienrousseau/crypto-testing";
 *
 * const result: MockHashPasswordResult = mockHashPassword("secret");
 * console.log(result.hash, result.phc);
 * ```
 */
export interface MockHashPasswordResult {
  /** Hex-encoded hash (deterministic, NOT Argon2). */
  hash: string;
  /** Hex-encoded salt. */
  salt: string;
  /** Dummy params matching the Argon2 shape. */
  params: {
    /** Time cost (iterations). */
    t: number;
    /** Memory cost (KiB). */
    m: number;
    /** Parallelism factor. */
    p: number;
  };
  /** Algorithm identifier. */
  algorithm: "mock-argon2id";
  /** PHC-format string. */
  phc: string;
}

/**
 * Instant mock of `hashPassword` that returns a deterministic result
 * without performing any real Argon2 computation.
 *
 * The "hash" is simply the SHA-256-style hex of the password XOR'd
 * with a fixed salt, suitable for testing control flow only.
 *
 * @example
 * ```ts
 * import { mockHashPassword } from "@sebastienrousseau/crypto-testing";
 *
 * const result = mockHashPassword("my-password");
 * console.log(result.hash); // deterministic hex string
 * console.log(result.phc);  // PHC-format string
 * ```
 */
export function mockHashPassword(
  password: string | Uint8Array,
): MockHashPasswordResult {
  const pw = toBytes(password);
  const salt = hexToBytes("00".repeat(16));
  const fakeHash = xorCipher(pw, salt);
  const hashHex = toHex(fakeHash).padEnd(64, "0");
  const saltHex = "00".repeat(16);
  return {
    hash: hashHex,
    salt: saltHex,
    params: { t: 1, m: 1024, p: 1 },
    algorithm: "mock-argon2id",
    phc: `$mock-argon2id$v=19$m=1024,t=1,p=1$${Buffer.from(salt).toString("base64")}$${Buffer.from(hexToBytes(hashHex)).toString("base64")}`,
  };
}

// ---------------------------------------------------------------------------
// Mock key pair generation
// ---------------------------------------------------------------------------

/**
 * Result from {@link mockGenerateKeyPair}.
 *
 * @example
 * ```ts
 * import type { MockKeyPair } from "@sebastienrousseau/crypto-testing";
 *
 * const kp: MockKeyPair = mockGenerateKeyPair("ed25519");
 * console.log(kp.publicKey, kp.kid);
 * ```
 */
export interface MockKeyPair {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
  /** Algorithm identifier. */
  algorithm: string;
  /** Key ID. */
  kid: string;
}

/**
 * Return a deterministic key pair for the given algorithm.
 *
 * For `ed25519`, `x25519`, and `p256` this returns the well-known
 * test vectors from {@link TEST_KEYS}. For any other algorithm a
 * synthetic pair of fixed hex strings is returned.
 *
 * @example
 * ```ts
 * import { mockGenerateKeyPair } from "@sebastienrousseau/crypto-testing";
 *
 * const kp = mockGenerateKeyPair("ed25519");
 * console.log(kp.publicKey, kp.privateKey);
 * ```
 */
export function mockGenerateKeyPair(
  algorithm: string = "ed25519",
): MockKeyPair {
  switch (algorithm) {
    case "ed25519":
      return {
        publicKey: TEST_KEYS.ed25519.publicKey,
        privateKey: TEST_KEYS.ed25519.privateKey,
        algorithm,
        kid: "mock-ed25519-kid",
      };
    case "x25519":
      return {
        publicKey: TEST_KEYS.x25519.publicKey,
        privateKey: TEST_KEYS.x25519.privateKey,
        algorithm,
        kid: "mock-x25519-kid",
      };
    case "p256":
      return {
        publicKey: TEST_KEYS.p256.publicKey,
        privateKey: TEST_KEYS.p256.privateKey,
        algorithm,
        kid: "mock-p256-kid",
      };
    default:
      return {
        publicKey: "aa".repeat(32),
        privateKey: "bb".repeat(32),
        algorithm,
        kid: `mock-${algorithm}-kid`,
      };
  }
}

// ---------------------------------------------------------------------------
// Mock encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * XOR-based fast fake encryption. Returns a hex-encoded "ciphertext"
 * that can be round-tripped with {@link mockDecrypt}.
 *
 * @example
 * ```ts
 * import { mockEncrypt, TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * const ct = mockEncrypt(TEST_KEYS.aes256, "hello world");
 * ```
 *
 * @param key       - Hex-encoded 256-bit key.
 * @param plaintext - UTF-8 string or bytes to encrypt.
 * @returns Hex-encoded "ciphertext".
 */
export function mockEncrypt(
  key: string,
  plaintext: string | Uint8Array,
): string {
  const keyBytes = hexToBytes(key);
  const ptBytes = toBytes(plaintext);
  return toHex(xorCipher(ptBytes, keyBytes));
}

/**
 * XOR-based fast fake decryption. Reverses {@link mockEncrypt}.
 *
 * @example
 * ```ts
 * import { mockEncrypt, mockDecrypt, TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * const ct = mockEncrypt(TEST_KEYS.aes256, "hello");
 * const pt = mockDecrypt(TEST_KEYS.aes256, ct);
 * ```
 *
 * @param key        - Hex-encoded 256-bit key.
 * @param ciphertext - Hex-encoded "ciphertext" from mockEncrypt.
 * @returns Decrypted bytes.
 */
export function mockDecrypt(key: string, ciphertext: string): Uint8Array {
  const keyBytes = hexToBytes(key);
  const ctBytes = hexToBytes(ciphertext);
  return xorCipher(ctBytes, keyBytes);
}

// ---------------------------------------------------------------------------
// Mock sign / verify
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic mock "signature" for the given message.
 *
 * The signature is the hex encoding of `message XOR privateKey` —
 * not cryptographically meaningful but deterministic and fast.
 *
 * @example
 * ```ts
 * import { mockSign, TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * const sig = mockSign(TEST_KEYS.ed25519.privateKey, "sign me");
 * ```
 *
 * @param privateKey - Hex-encoded private key.
 * @param message    - UTF-8 string or bytes to sign.
 * @returns Hex-encoded mock signature.
 */
export function mockSign(
  privateKey: string,
  message: string | Uint8Array,
): string {
  const keyBytes = hexToBytes(privateKey);
  const msgBytes = toBytes(message);
  return toHex(xorCipher(msgBytes, keyBytes));
}

/**
 * Verify a mock signature produced by {@link mockSign}.
 *
 * Re-signs the message with the private key and checks that the
 * result matches the provided signature.
 *
 * @example
 * ```ts
 * import { mockSign, mockVerify, TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * const sig = mockSign(TEST_KEYS.ed25519.privateKey, "msg");
 * const ok = mockVerify(TEST_KEYS.ed25519.publicKey, "msg", sig, TEST_KEYS.ed25519.privateKey);
 * ```
 *
 * @param _publicKey - Hex-encoded public key (unused; included for API parity).
 * @param message    - UTF-8 string or bytes that were signed.
 * @param signature  - Hex-encoded signature from mockSign.
 * @param privateKey - Hex-encoded private key used to produce the signature.
 * @returns `true` if the signature matches, `false` otherwise.
 */
export function mockVerify(
  _publicKey: string,
  message: string | Uint8Array,
  signature: string,
  privateKey: string,
): boolean {
  const expected = mockSign(privateKey, message);
  return expected === signature;
}
