// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypt and decrypt data using XChaCha20-Poly1305 (AEAD).
 *
 * Run: `npx ts-node examples/encrypt.ts`
 */

import { aeadEncrypt, aeadDecrypt, crypto } from "../src";

function main() {
  console.log("\n=== crypto-lib — encrypt ===\n");

  // Generate a random 256-bit key (hex-encoded)
  const key = crypto.randomKey();
  console.log(`Key:        ${key.slice(0, 16)}...`);

  const plaintext = "Top secret message for your eyes only.";
  console.log(`Plaintext:  ${plaintext}`);

  // Encrypt with XChaCha20-Poly1305
  const { ciphertext, algorithm } = aeadEncrypt({ key, plaintext });
  console.log(`Algorithm:  ${algorithm}`);
  console.log(`Ciphertext: ${ciphertext.slice(0, 40)}...`);

  // Decrypt
  const decrypted = aeadDecrypt({ key, ciphertext });
  const recovered = Buffer.from(decrypted).toString("utf8");
  console.log(`Decrypted:  ${recovered}`);

  // Verify round-trip
  console.log(`\nRound-trip: ${recovered === plaintext ? "PASS" : "FAIL"}`);

  // Encrypt with AAD (Additional Authenticated Data)
  const aad = Buffer.from("context-id:42", "utf8");
  const { ciphertext: ct2 } = aeadEncrypt({ key, plaintext, aad });
  const pt2 = aeadDecrypt({ key, ciphertext: ct2, aad });
  console.log(`With AAD:   ${Buffer.from(pt2).toString("utf8") === plaintext ? "PASS" : "FAIL"}`);

  console.log("\nDone.");
}

main();
