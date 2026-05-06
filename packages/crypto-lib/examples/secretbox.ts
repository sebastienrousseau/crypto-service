// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * High-level secretbox: symmetric authenticated encryption with automatic
 * nonce generation (XChaCha20-Poly1305).
 *
 * Run: `npx ts-node examples/secretbox.ts`
 */

import { secretbox, crypto } from "../src";

function main() {
  console.log("\n=== crypto-lib — secretbox ===\n");

  // Generate a 256-bit key
  const key = crypto.randomKey();
  console.log(`Key: ${key.slice(0, 16)}...`);

  // Seal (encrypt + authenticate)
  const plaintext = "Secretbox makes symmetric crypto simple.";
  const { sealed, algorithm } = secretbox.seal(key, plaintext);
  console.log(`Algorithm:  ${algorithm}`);
  console.log(`Sealed:     ${sealed.slice(0, 40)}...`);

  // Open (decrypt + verify)
  const opened = secretbox.open(key, sealed);
  const recovered = Buffer.from(opened).toString("utf8");
  console.log(`Recovered:  ${recovered}`);
  console.log(`Match:      ${recovered === plaintext}`);

  // Round-trip with raw bytes
  const raw = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const { sealed: s2 } = secretbox.seal(key, raw);
  const opened2 = secretbox.open(key, s2);
  console.log(`\nBinary round-trip: ${Buffer.from(opened2).toString("hex") === "deadbeef"}`);

  console.log("\nDone.");
}

main();
