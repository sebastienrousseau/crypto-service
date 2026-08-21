// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Demonstrates AES-GCM encryption and decryption at the edge.
 *
 * Run: `npx ts-node examples/encrypt.ts`
 */

import { generateKey, encrypt, decrypt, toHex } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

async function main() {
  header("crypto-edge -- encrypt");

  const key = await task("Generate 256-bit AES-GCM key", async () => {
    return generateKey({ algorithm: "AES-GCM", length: 256 });
  });

  await taskWithOutput("Display key", () => {
    return [`key (hex): ${toHex(key)}`, `key length: ${key.length} bytes`];
  });

  const message = "Edge-side AES-GCM encryption works!";
  const { ciphertext } = await task("Encrypt message", async () => {
    return encrypt({ key, plaintext: new TextEncoder().encode(message) });
  });

  await taskWithOutput("Decrypt and verify round-trip", async () => {
    const plaintext = await decrypt({ key, ciphertext });
    const decoded = new TextDecoder().decode(plaintext);
    return [
      `plaintext: "${decoded}"`,
      `match:     ${decoded === message}`,
    ];
  });

  await taskWithOutput("Encrypt with AAD (additional authenticated data)", async () => {
    const aad = new TextEncoder().encode("context:edge-v1");
    const encrypted = await encrypt({
      key,
      plaintext: new TextEncoder().encode(message),
      aad,
    });
    const plaintext = await decrypt({ key, ciphertext: encrypted.ciphertext, aad });
    const decoded = new TextDecoder().decode(plaintext);
    return [
      `aad:       "context:edge-v1"`,
      `plaintext: "${decoded}"`,
      `match:     ${decoded === message}`,
    ];
  });

  summary(5);
}

main();
