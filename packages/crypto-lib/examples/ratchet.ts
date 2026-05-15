// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Double Ratchet protocol: forward-secret messaging between two parties.
 *
 * Run: `npx ts-node examples/ratchet.ts`
 */

import { header, task, summary } from "./support";
import { protocols } from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";
import { x25519 } from "@noble/curves/ed25519.js";

const { DoubleRatchet } = protocols.ratchet;

async function main() {
  header("crypto-lib -- ratchet");

  const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
  const bobRatchetPriv = randomBytes(32);
  const bobRatchetPub = x25519.getPublicKey(bobRatchetPriv);
  const bobKeyPair = {
    privateKey: Buffer.from(bobRatchetPriv).toString("hex"),
    publicKey: Buffer.from(bobRatchetPub).toString("hex"),
  };

  const alice = DoubleRatchet.initAlice(sharedSecret, bobKeyPair.publicKey);
  const bob = DoubleRatchet.initBob(sharedSecret, bobKeyPair);

  await task("Alice sends two messages to Bob", () => {
    const msg1 = alice.encrypt("Hello Bob, this is message 1.");
    const msg2 = alice.encrypt("And this is message 2.");
    const pt1 = bob.decrypt(msg1.header, msg1.ciphertext);
    const pt2 = bob.decrypt(msg2.header, msg2.ciphertext);
    if (Buffer.from(pt1).toString("utf8") !== "Hello Bob, this is message 1.") throw new Error("Decrypt failed");
    if (Buffer.from(pt2).toString("utf8") !== "And this is message 2.") throw new Error("Decrypt failed");
  });

  await task("Bob responds (DH ratchet step)", () => {
    const msg3 = bob.encrypt("Hi Alice, got your messages!");
    const pt3 = alice.decrypt(msg3.header, msg3.ciphertext);
    if (Buffer.from(pt3).toString("utf8") !== "Hi Alice, got your messages!") throw new Error("Decrypt failed");
  });

  await task("Alice continues (ratchet advanced)", () => {
    const msg4 = alice.encrypt("Great, the ratchet advanced!");
    const pt4 = bob.decrypt(msg4.header, msg4.ciphertext);
    if (Buffer.from(pt4).toString("utf8") !== "Great, the ratchet advanced!") throw new Error("Decrypt failed");
  });

  summary(3);
}

main();
