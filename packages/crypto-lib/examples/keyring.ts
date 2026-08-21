// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Keyring management: create, add, rotate, list, and export keys.
 *
 * Run: `npx ts-node examples/keyring.ts`
 */

import { header, task, summary } from "./support";
import { Keyring, crypto } from "../src";

async function main() {
  header("crypto-lib -- keyring");

  const ring = new Keyring();

  const sigKey = await task("Add Ed25519 signing key", () => ring.add("ed25519", { use: "sig" }));

  await task("Add X25519 encryption key", () => ring.add("x25519", { use: "enc" }));

  await task("Rotate signing key", () => ring.rotate(sigKey.kid));

  await task("Export public keys as JWKS", () => {
    const jwks = ring.toJwks();
    if (jwks.keys.length === 0) throw new Error("JWKS is empty");
  });

  await task("Encrypt and restore keyring", () => {
    const password = crypto.randomKey();
    const encrypted = ring.toEncrypted(password);
    const restored = Keyring.fromEncrypted(password, encrypted);
    if (restored.size !== ring.size) throw new Error("Keyring sizes differ");
  });

  summary(5);
}

main();
