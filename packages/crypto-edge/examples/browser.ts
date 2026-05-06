/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Browser usage example.
 *
 * Demonstrates how to use crypto-edge directly in a web browser.
 * Bundle this file with your bundler (esbuild, Vite, webpack, etc.)
 * and include the output in an HTML page.
 *
 * ```html
 * <script type="module" src="./browser.bundle.js"></script>
 * ```
 */

import {
  detectRuntime,
  getCapabilities,
  hash,
  encrypt,
  decrypt,
  generateKey,
  toHex,
} from "../src";

async function main(): Promise<void> {
  const output = document.getElementById("output");
  const log = (msg: string) => {
    if (output) {
      output.textContent += msg + "\n";
    }
    // eslint-disable-next-line no-console
    console.log(msg);
  };

  // Runtime detection
  const runtime = detectRuntime();
  const caps = getCapabilities();
  log(`Runtime: ${runtime}`);
  log(`Web Crypto: ${caps.hasSubtle}`);
  log(`TextEncoder: ${caps.hasTextEncoder}`);
  log("");

  // Hashing
  const digest = await hash("SHA-256", "hello from the browser");
  log(`SHA-256("hello from the browser"):`);
  log(`  ${digest}`);
  log("");

  // Encryption round-trip
  const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
  log(`Generated AES-256-GCM key: ${toHex(key).slice(0, 16)}...`);

  const message = "Browser-side encryption works!";
  const { ciphertext } = await encrypt({
    key,
    plaintext: new TextEncoder().encode(message),
  });
  log(`Encrypted ${message.length} bytes -> ${ciphertext.length} bytes ciphertext`);

  const plaintext = await decrypt({ key, ciphertext });
  const decoded = new TextDecoder().decode(plaintext);
  log(`Decrypted: "${decoded}"`);
  log(`Round-trip match: ${decoded === message}`);
}

// Auto-run when loaded as a module
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("crypto-edge browser example failed:", err);
});
