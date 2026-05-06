// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * ML-KEM-768 (FIPS 203) post-quantum key encapsulation mechanism.
 * Demonstrates key generation, encapsulation, and decapsulation.
 *
 * Run: `npx ts-node examples/pqkem.ts`
 */

import { mlKemKeygen, mlKemEncapsulate, mlKemDecapsulate } from "../src";

function main() {
  console.log("\n=== crypto-lib — pqkem ===\n");

  // Generate an ML-KEM-768 key pair (NIST Level 3)
  const kp = mlKemKeygen(768);
  console.log(`Algorithm:    ${kp.algorithm}`);
  console.log(`Public key:   ${kp.publicKey.slice(0, 40)}... (${kp.publicKey.length / 2} bytes)`);
  console.log(`Secret key:   ${kp.secretKey.slice(0, 40)}... (${kp.secretKey.length / 2} bytes)`);

  // Encapsulate: sender produces a shared secret and ciphertext
  const encap = mlKemEncapsulate(768, kp.publicKey);
  console.log(`\nEncapsulation:`);
  console.log(`  Ciphertext:     ${encap.ciphertext.slice(0, 40)}... (${encap.ciphertext.length / 2} bytes)`);
  console.log(`  Shared secret:  ${encap.sharedSecret}`);

  // Decapsulate: recipient recovers the shared secret
  const decap = mlKemDecapsulate(768, kp.secretKey, encap.ciphertext);
  console.log(`\nDecapsulation:`);
  console.log(`  Shared secret:  ${decap.sharedSecret}`);

  // Verify both sides derived the same secret
  console.log(`\nSecrets match: ${encap.sharedSecret === decap.sharedSecret}`);

  console.log("\nDone.");
}

main();
