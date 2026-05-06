// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * ML-DSA-65 (FIPS 204) post-quantum digital signatures.
 * Demonstrates key generation, signing, and verification.
 *
 * Run: `npx ts-node examples/pqsign.ts`
 */

import { mlDsaKeygen, mlDsaSign, mlDsaVerify } from "../src";

function main() {
  console.log("\n=== crypto-lib — pqsign ===\n");

  // Generate an ML-DSA-65 key pair (NIST Level 3)
  const kp = mlDsaKeygen(65);
  console.log(`Algorithm:    ${kp.algorithm}`);
  console.log(`Public key:   ${kp.publicKey.slice(0, 40)}... (${kp.publicKey.length / 2} bytes)`);
  console.log(`Secret key:   ${kp.secretKey.slice(0, 40)}... (${kp.secretKey.length / 2} bytes)`);

  // Sign a message
  const message = "Post-quantum secure message.";
  const sig = mlDsaSign(65, kp.secretKey, message);
  console.log(`\nSignature:    ${sig.signature.slice(0, 40)}... (${sig.signature.length / 2} bytes)`);
  console.log(`Algorithm:    ${sig.algorithm}`);

  // Verify the signature
  const result = mlDsaVerify(65, kp.publicKey, message, sig.signature);
  console.log(`\nValid:        ${result.valid}`);

  // Verify with tampered message
  const tampered = mlDsaVerify(65, kp.publicKey, "tampered", sig.signature);
  console.log(`Tampered:     ${tampered.valid} (expected false)`);

  console.log("\nDone.");
}

main();
