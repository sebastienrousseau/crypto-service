// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * High-level secretbox: symmetric authenticated encryption with automatic
 * nonce generation (XChaCha20-Poly1305).
 *
 * Run: `npx ts-node examples/secretbox.ts`
 */

import { header, task, summary } from "./support";
import { secretbox, crypto } from "../src";

async function main() {
  header("crypto-lib -- secretbox");

  const key = await task("Generate 256-bit key", () => crypto.randomKey());

  const plaintext = "Secretbox makes symmetric crypto simple.";

  await task("Seal (encrypt + authenticate)", () => {
    const { sealed } = secretbox.seal(key, plaintext);
    const opened = secretbox.open(key, sealed);
    const recovered = Buffer.from(opened).toString("utf8");
    if (recovered !== plaintext) throw new Error("Round-trip failed");
  });

  await task("Seal and open raw bytes", () => {
    const raw = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const { sealed } = secretbox.seal(key, raw);
    const opened = secretbox.open(key, sealed);
    if (Buffer.from(opened).toString("hex") !== "deadbeef") throw new Error("Binary round-trip failed");
  });

  summary(3);
}

main();
