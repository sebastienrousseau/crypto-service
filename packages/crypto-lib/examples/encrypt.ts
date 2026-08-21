// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypt and decrypt data using XChaCha20-Poly1305 (AEAD).
 *
 * Run: `npx ts-node examples/encrypt.ts`
 */

import { header, task, summary } from "./support";
import { aeadEncrypt, aeadDecrypt, crypto } from "../src";

async function main() {
  header("crypto-lib -- encrypt");

  const key = await task("Generate random 256-bit key", () => crypto.randomKey());

  const plaintext = "Top secret message for your eyes only.";

  const ct = await task("Encrypt with XChaCha20-Poly1305", () => {
    return aeadEncrypt({ key, plaintext });
  });

  await task("Decrypt and verify round-trip", () => {
    const decrypted = aeadDecrypt({ key, ciphertext: ct.ciphertext });
    const recovered = Buffer.from(decrypted).toString("utf8");
    if (recovered !== plaintext) throw new Error("Round-trip failed");
  });

  await task("Encrypt with Additional Authenticated Data", () => {
    const aad = Buffer.from("context-id:42", "utf8");
    const { ciphertext } = aeadEncrypt({ key, plaintext, aad });
    const pt = aeadDecrypt({ key, ciphertext, aad });
    if (Buffer.from(pt).toString("utf8") !== plaintext) throw new Error("AAD round-trip failed");
  });

  summary(4);
}

main();
