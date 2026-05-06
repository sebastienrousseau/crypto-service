// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Keyring management: create, add, rotate, list, and export keys.
 *
 * Run: `npx ts-node examples/keyring.ts`
 */

import { Keyring, crypto } from "../src";

function main() {
  console.log("\n=== crypto-lib — keyring ===\n");

  // Create a new keyring
  const ring = new Keyring();

  // Add keys for different purposes
  const sigKey = ring.add("ed25519", { use: "sig" });
  console.log(`Added Ed25519 signing key:   ${sigKey.kid}`);

  const encKey = ring.add("x25519", { use: "enc" });
  console.log(`Added X25519 encryption key: ${encKey.kid}`);

  console.log(`Keyring size: ${ring.size}`);

  // List active keys
  const active = ring.list();
  console.log(`\nActive keys: ${active.length}`);
  for (const k of active) {
    console.log(`  ${k.kid} (${k.algorithm}, use=${k.use ?? "any"})`);
  }

  // Rotate the signing key (archives old, generates new)
  const newSigKey = ring.rotate(sigKey.kid);
  console.log(`\nRotated: ${sigKey.kid} -> ${newSigKey.kid}`);
  console.log(`Keyring size (including archived): ${ring.size}`);
  console.log(`Active keys after rotation: ${ring.list().length}`);

  // Export public keys as JWKS
  const jwks = ring.toJwks();
  console.log(`\nJWKS (${jwks.keys.length} keys):`);
  console.log(JSON.stringify(jwks, null, 2));

  // Encrypt and restore the keyring
  const password = crypto.randomKey();
  const encrypted = ring.toEncrypted(password);
  console.log(`\nEncrypted keyring: ${encrypted.slice(0, 40)}...`);

  const restored = Keyring.fromEncrypted(password, encrypted);
  console.log(`Restored keyring size: ${restored.size}`);

  console.log("\nDone.");
}

main();
