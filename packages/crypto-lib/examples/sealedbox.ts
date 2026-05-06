// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Anonymous public-key encryption using sealed boxes.
 * The sender generates an ephemeral X25519 key pair, so the recipient
 * cannot identify the sender.
 *
 * Run: `npx ts-node examples/sealedbox.ts`
 */

import { sealedbox, generateX25519KeyPair } from "../src";

function main() {
  console.log("\n=== crypto-lib — sealedbox ===\n");

  // Recipient generates a long-term X25519 key pair
  const recipient = generateX25519KeyPair();
  console.log(`Recipient public key:  ${recipient.publicKey.slice(0, 32)}...`);

  // Anonymous sender encrypts to the recipient's public key
  const message = "You will never know who sent this.";
  const { sealed, algorithm } = sealedbox.seal(recipient.publicKey, message);
  console.log(`Algorithm:             ${algorithm}`);
  console.log(`Sealed box:            ${sealed.slice(0, 40)}...`);

  // Recipient decrypts with their private key
  const opened = sealedbox.open(recipient.privateKey, sealed);
  const plaintext = Buffer.from(opened).toString("utf8");
  console.log(`Decrypted:             ${plaintext}`);
  console.log(`Match:                 ${plaintext === message}`);

  console.log("\nDone.");
}

main();
