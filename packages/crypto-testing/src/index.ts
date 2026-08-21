// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @module @sebastienrousseau/crypto-testing
 *
 * Deterministic keys, fast mocks, and test fixtures for crypto-lib.
 * Makes your CI/CD pipeline fast and reproducible.
 */

// Deterministic test key fixtures
export { TEST_KEYS, TEST_VECTORS } from "./keys";

// Mock crypto functions (fast, no real crypto)
export {
  mockHashPassword,
  mockGenerateKeyPair,
  mockEncrypt,
  mockDecrypt,
  mockSign,
  mockVerify,
} from "./mock";

// Pre-built test fixture generators
export {
  createTestKeyring,
  createTestEncryptedMessage,
  createTestSignedMessage,
  createTestPasswordHash,
} from "./fixtures";

// Test assertion helpers
export {
  expectValidHex,
  expectValidBase64,
  expectKeyPair,
  expectEncryptDecryptRoundTrip,
  expectSignVerifyRoundTrip,
} from "./helpers";
