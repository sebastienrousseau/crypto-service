// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hybrid post-quantum key exchange: X25519 + ML-KEM-768.
 * Combines classical ECDH with post-quantum KEM so security holds
 * even if one algorithm family is broken.
 *
 * Run: `npx ts-node examples/hybrid.ts`
 */

import {
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
} from "../src";

function main() {
  console.log("\n=== crypto-lib — hybrid ===\n");

  // Recipient generates a hybrid key pair (X25519 + ML-KEM-768)
  const kp = hybridKemKeygen(768);
  console.log(`Algorithm:          ${kp.algorithm}`);
  console.log(`X25519 public key:  ${kp.x25519PublicKey}`);
  console.log(`ML-KEM public key:  ${kp.mlKemPublicKey.slice(0, 40)}... (${kp.mlKemPublicKey.length / 2} bytes)`);

  // Sender encapsulates: performs X25519 ECDH + ML-KEM encapsulation
  const encap = hybridKemEncapsulate(768, kp.x25519PublicKey, kp.mlKemPublicKey);
  console.log(`\nSender's shared secret:    ${encap.sharedSecret}`);
  console.log(`X25519 ephemeral public:   ${encap.x25519EphemeralPublic}`);
  console.log(`ML-KEM ciphertext:         ${encap.mlKemCiphertext.slice(0, 40)}...`);

  // Recipient decapsulates: recovers the same shared secret
  const decap = hybridKemDecapsulate(
    768,
    kp.x25519PrivateKey,
    kp.mlKemSecretKey,
    encap.x25519EphemeralPublic,
    encap.mlKemCiphertext,
  );
  console.log(`\nRecipient's shared secret: ${decap.sharedSecret}`);
  console.log(`Secrets match:             ${encap.sharedSecret === decap.sharedSecret}`);

  console.log("\nDone.");
}

main();
