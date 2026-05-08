// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Anonymous public-key encryption using sealed boxes.
 * The sender generates an ephemeral X25519 key pair, so the recipient
 * cannot identify the sender.
 *
 * Run: `npx ts-node examples/sealedbox.ts`
 */

import { header, task, summary } from "./support";
import { sealedbox, generateX25519KeyPair } from "../src";

async function main() {
  header("crypto-lib -- sealedbox");

  const recipient = await task("Generate recipient X25519 key pair", () => generateX25519KeyPair());

  const message = "You will never know who sent this.";

  await task("Seal to recipient public key", () => {
    const { sealed } = sealedbox.seal(recipient.publicKey, message);
    const opened = sealedbox.open(recipient.privateKey, sealed);
    const plaintext = Buffer.from(opened).toString("utf8");
    if (plaintext !== message) throw new Error("Round-trip failed");
  });

  summary(2);
}

main();
