// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Double Ratchet protocol: forward-secret messaging between two parties.
 * Alice and Bob exchange messages with per-message key derivation and
 * DH ratchet steps that provide break-in recovery.
 *
 * Run: `npx ts-node examples/ratchet.ts`
 */

import { protocols } from "../src";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { x25519 } from "@noble/curves/ed25519";

const { DoubleRatchet } = protocols.ratchet;

function main() {
  console.log("\n=== crypto-lib — ratchet ===\n");

  // Simulate a shared secret established via PQXDH or similar key agreement
  const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
  console.log(`Shared secret: ${sharedSecret.slice(0, 32)}...`);

  // Bob generates an initial ratchet key pair
  const bobRatchetPriv = randomBytes(32);
  const bobRatchetPub = x25519.getPublicKey(bobRatchetPriv);
  const bobKeyPair = {
    privateKey: Buffer.from(bobRatchetPriv).toString("hex"),
    publicKey: Buffer.from(bobRatchetPub).toString("hex"),
  };

  // Initialize ratchets
  const alice = DoubleRatchet.initAlice(sharedSecret, bobKeyPair.publicKey);
  const bob = DoubleRatchet.initBob(sharedSecret, bobKeyPair);

  // Alice sends messages to Bob
  console.log("\n--- Alice -> Bob ---");
  const msg1 = alice.encrypt("Hello Bob, this is message 1.");
  console.log(`  Message 1 ciphertext: ${msg1.ciphertext.slice(0, 40)}...`);

  const msg2 = alice.encrypt("And this is message 2.");
  console.log(`  Message 2 ciphertext: ${msg2.ciphertext.slice(0, 40)}...`);

  // Bob decrypts
  const pt1 = bob.decrypt(msg1.header, msg1.ciphertext);
  console.log(`  Bob decrypted 1: ${Buffer.from(pt1).toString("utf8")}`);

  const pt2 = bob.decrypt(msg2.header, msg2.ciphertext);
  console.log(`  Bob decrypted 2: ${Buffer.from(pt2).toString("utf8")}`);

  // Bob responds (triggers DH ratchet step)
  console.log("\n--- Bob -> Alice ---");
  const msg3 = bob.encrypt("Hi Alice, got your messages!");
  console.log(`  Message 3 ciphertext: ${msg3.ciphertext.slice(0, 40)}...`);

  const pt3 = alice.decrypt(msg3.header, msg3.ciphertext);
  console.log(`  Alice decrypted 3: ${Buffer.from(pt3).toString("utf8")}`);

  // Another round
  const msg4 = alice.encrypt("Great, the ratchet advanced!");
  const pt4 = bob.decrypt(msg4.header, msg4.ciphertext);
  console.log(`  Bob decrypted 4: ${Buffer.from(pt4).toString("utf8")}`);

  console.log("\nAll messages exchanged with forward secrecy.");
  console.log("\nDone.");
}

main();
