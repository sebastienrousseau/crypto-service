/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Runtime detection example.
 *
 * Demonstrates how to detect the current JavaScript runtime and
 * inspect its cryptographic capabilities.
 *
 * Run with:
 *   npx ts-node examples/detect.ts
 */

import { detectRuntime, getCapabilities, isEdgeCryptoAvailable } from "../src";

// Detect the runtime
const runtime = detectRuntime();
console.log(`Detected runtime: ${runtime}`);

// Get full capabilities
const caps = getCapabilities();
console.log("Runtime capabilities:");
console.log(`  runtime:       ${caps.runtime}`);
console.log(`  hasWebCrypto:  ${caps.hasWebCrypto}`);
console.log(`  hasSubtle:     ${caps.hasSubtle}`);
console.log(`  hasNodeCrypto: ${caps.hasNodeCrypto}`);
console.log(`  hasTextEncoder: ${caps.hasTextEncoder}`);

// Quick crypto availability check
if (isEdgeCryptoAvailable()) {
  console.log("\nWeb Crypto API is available -- safe to use hash(), encrypt(), etc.");
} else {
  console.log("\nWeb Crypto API is NOT available -- consider installing polyfills.");
}
