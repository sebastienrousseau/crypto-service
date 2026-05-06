// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Use the LocalKmsProvider to create keys, encrypt, and decrypt data.
 *
 * Run: `npx ts-node examples/local.ts`
 */

import { LocalKmsProvider } from "../src";

async function main() {
  console.log("\n=== crypto-kms — local provider ===\n");

  const kms = new LocalKmsProvider();

  // Create an encryption key
  const encKey = await kms.createKey("aes-256-gcm", "encrypt");
  console.log("Created encryption key:", encKey.keyId);
  console.log("Algorithm:            ", encKey.algorithm);
  console.log("Usage:                ", encKey.usage);

  // Encrypt plaintext
  const plaintext = new TextEncoder().encode("Hello, crypto-kms!");
  const encrypted = await kms.encrypt(encKey.keyId, plaintext);
  console.log("\nCiphertext (base64):", encrypted.ciphertext.slice(0, 40) + "...");

  // Decrypt ciphertext
  const decrypted = await kms.decrypt(encKey.keyId, encrypted.ciphertext);
  console.log("Decrypted:          ", new TextDecoder().decode(decrypted.plaintext));

  // Create a signing key
  const signKey = await kms.createKey("ed25519", "sign");
  console.log("\nCreated signing key:", signKey.keyId);

  // Sign data
  const message = new TextEncoder().encode("Sign this message");
  const signed = await kms.sign(signKey.keyId, message);
  console.log("Signature (base64): ", signed.signature.slice(0, 40) + "...");

  // Verify signature
  const valid = await kms.verify(signKey.keyId, message, signed.signature);
  console.log("Signature valid:    ", valid);

  // List all keys
  const keys = await kms.listKeys();
  console.log("\nAll keys:", keys.length);
  for (const k of keys) {
    console.log(`  - ${k.keyId} (${k.algorithm}, ${k.usage})`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
