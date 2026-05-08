// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Browser usage example for crypto-edge.
 *
 * Bundle this file with your bundler (esbuild, Vite, webpack, etc.)
 * and include the output in an HTML page.
 *
 * Run: `npx ts-node examples/browser.ts`
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
import { header, task, taskWithOutput, summary } from "./support";

async function main() {
  header("crypto-edge -- browser");

  await taskWithOutput("Detect runtime and capabilities", () => {
    const runtime = detectRuntime();
    const caps = getCapabilities();
    return [
      `runtime:     ${runtime}`,
      `Web Crypto:  ${caps.hasSubtle}`,
      `TextEncoder: ${caps.hasTextEncoder}`,
    ];
  });

  await taskWithOutput("SHA-256 hash", async () => {
    const digest = await hash("SHA-256", "hello from the browser");
    return [digest];
  });

  const key = await task("Generate AES-256-GCM key", async () => {
    return generateKey({ algorithm: "AES-GCM", length: 256 });
  });

  await taskWithOutput("Encrypt and decrypt round-trip", async () => {
    const message = "Browser-side encryption works!";
    const { ciphertext } = await encrypt({
      key,
      plaintext: new TextEncoder().encode(message),
    });
    const plaintext = await decrypt({ key, ciphertext });
    const decoded = new TextDecoder().decode(plaintext);
    return [
      `plaintext: "${decoded}"`,
      `match:     ${decoded === message}`,
    ];
  });

  summary(4);
}

main();
