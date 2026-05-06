// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Ed25519 digital signatures: generate key pair, sign, and verify.
 *
 * Run: `npx ts-node examples/sign.ts`
 */

import { generateEd25519KeyPair, ed25519Sign, ed25519Verify } from "../src";

function main() {
  console.log("\n=== crypto-lib — sign ===\n");

  // Generate Ed25519 key pair
  const kp = generateEd25519KeyPair();
  console.log(`Public key:  ${kp.publicKey.slice(0, 32)}...`);
  console.log(`Private key: ${kp.privateKey.slice(0, 32)}...`);

  // Sign a message
  const message = "Authenticate this payload.";
  const { signature, algorithm } = ed25519Sign(kp.privateKey, message);
  console.log(`\nAlgorithm:   ${algorithm}`);
  console.log(`Signature:   ${signature.slice(0, 40)}...`);

  // Verify the signature
  const { valid } = ed25519Verify(kp.publicKey, message, signature);
  console.log(`Valid:       ${valid}`);

  // Verify with wrong message
  const { valid: invalid } = ed25519Verify(kp.publicKey, "tampered", signature);
  console.log(`Tampered:    ${invalid} (expected false)`);

  console.log("\nDone.");
}

main();
