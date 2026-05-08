// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Test fixture generators.
 *
 * Convenience functions that return pre-built test data structures,
 * ready to use in unit and integration tests without calling real
 * crypto operations.
 */

import { TEST_KEYS, TEST_VECTORS } from "./keys";
import {
  mockEncrypt,
  mockSign,
  mockHashPassword,
  mockGenerateKeyPair,
  type MockKeyPair,
  type MockHashPasswordResult,
} from "./mock";

// ---------------------------------------------------------------------------
// Keyring fixture
// ---------------------------------------------------------------------------

/**
 * A pre-populated keyring containing deterministic key pairs.
 *
 * @example
 * ```ts
 * import type { TestKeyring } from "@sebastienrousseau/crypto-testing";
 *
 * const ring: TestKeyring = createTestKeyring();
 * console.log(ring.signing.publicKey, ring.symmetric);
 * ```
 */
export interface TestKeyring {
  /** Ed25519 signing key pair. */
  signing: MockKeyPair;
  /** X25519 key-exchange key pair. */
  exchange: MockKeyPair;
  /** P-256 ECDSA signing key pair. */
  ecdsa: MockKeyPair;
  /** AES-256 symmetric key (hex). */
  symmetric: string;
  /** HMAC key (hex). */
  hmac: string;
}

/**
 * Create a test keyring containing deterministic key pairs for all
 * common algorithms. No real key generation is performed.
 *
 * @example
 * ```ts
 * import { createTestKeyring } from "@sebastienrousseau/crypto-testing";
 *
 * const keyring = createTestKeyring();
 * console.log(keyring.signing.algorithm); // "ed25519"
 * ```
 */
export function createTestKeyring(): TestKeyring {
  return {
    signing: mockGenerateKeyPair("ed25519"),
    exchange: mockGenerateKeyPair("x25519"),
    ecdsa: mockGenerateKeyPair("p256"),
    symmetric: TEST_KEYS.aes256,
    hmac: TEST_KEYS.hmacKey,
  };
}

// ---------------------------------------------------------------------------
// Encrypted message fixture
// ---------------------------------------------------------------------------

/**
 * A pre-built encrypted message for testing decryption flows.
 *
 * @example
 * ```ts
 * import type { TestEncryptedMessage } from "@sebastienrousseau/crypto-testing";
 *
 * const msg: TestEncryptedMessage = createTestEncryptedMessage();
 * console.log(msg.ciphertext, msg.algorithm);
 * ```
 */
export interface TestEncryptedMessage {
  /** The key used for encryption (hex). */
  key: string;
  /** The original plaintext. */
  plaintext: string;
  /** The mock-encrypted ciphertext (hex). */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: "mock-xor";
}

/**
 * Create a test encrypted message using mock XOR encryption.
 *
 * @example
 * ```ts
 * import { createTestEncryptedMessage } from "@sebastienrousseau/crypto-testing";
 *
 * const msg = createTestEncryptedMessage("secret data");
 * console.log(msg.ciphertext); // hex-encoded XOR ciphertext
 * ```
 *
 * @param plaintext - Optional plaintext to encrypt. Defaults to the
 *                    well-known test vector.
 * @param key       - Optional hex key. Defaults to `TEST_KEYS.aes256`.
 */
export function createTestEncryptedMessage(
  plaintext?: string,
  key?: string,
): TestEncryptedMessage {
  const pt = plaintext ?? TEST_VECTORS.plaintext;
  const k = key ?? TEST_KEYS.aes256;
  return {
    key: k,
    plaintext: pt,
    ciphertext: mockEncrypt(k, pt),
    algorithm: "mock-xor",
  };
}

// ---------------------------------------------------------------------------
// Signed message fixture
// ---------------------------------------------------------------------------

/**
 * A pre-built signed message for testing verification flows.
 *
 * @example
 * ```ts
 * import type { TestSignedMessage } from "@sebastienrousseau/crypto-testing";
 *
 * const msg: TestSignedMessage = createTestSignedMessage();
 * console.log(msg.signature, msg.algorithm);
 * ```
 */
export interface TestSignedMessage {
  /** Algorithm used. */
  algorithm: string;
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
  /** The message that was signed. */
  message: string;
  /** Hex-encoded mock signature. */
  signature: string;
}

/**
 * Create a test signed message using mock signing.
 *
 * @example
 * ```ts
 * import { createTestSignedMessage } from "@sebastienrousseau/crypto-testing";
 *
 * const signed = createTestSignedMessage("p256", "verify me");
 * console.log(signed.signature, signed.publicKey);
 * ```
 *
 * @param algorithm - Key algorithm. Defaults to `"ed25519"`.
 * @param message   - Message to sign. Defaults to the well-known test vector.
 */
export function createTestSignedMessage(
  algorithm?: string,
  message?: string,
): TestSignedMessage {
  const alg = algorithm ?? "ed25519";
  const msg = message ?? TEST_VECTORS.plaintext;
  const kp = mockGenerateKeyPair(alg);
  return {
    algorithm: alg,
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
    message: msg,
    signature: mockSign(kp.privateKey, msg),
  };
}

// ---------------------------------------------------------------------------
// Password hash fixture
// ---------------------------------------------------------------------------

/**
 * Create a test password hash using mock hashing.
 *
 * @example
 * ```ts
 * import { createTestPasswordHash } from "@sebastienrousseau/crypto-testing";
 *
 * const result = createTestPasswordHash("hunter2");
 * console.log(result.hash, result.phc);
 * ```
 *
 * @param password - Password to hash. Defaults to `"test-password-123"`.
 */
export function createTestPasswordHash(
  password?: string,
): MockHashPasswordResult {
  return mockHashPassword(password ?? "test-password-123");
}
