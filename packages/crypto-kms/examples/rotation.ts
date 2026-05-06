// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key rotation workflow.
 *
 * Demonstrates creating a key, encrypting data, rotating the key, and
 * re-encrypting data with the new key material.
 *
 * Run: `npx ts-node examples/rotation.ts`
 */

import { LocalKmsProvider } from "../src";

async function main() {
  console.log("\n=== crypto-kms — key rotation ===\n");

  const kms = new LocalKmsProvider();

  // Step 1: Create an encryption key
  const key = await kms.createKey("aes-256-gcm", "encrypt");
  console.log("Created key:", key.keyId);
  console.log("Created at: ", key.createdAt);

  // Step 2: Encrypt data with the original key
  const plaintext = new TextEncoder().encode("Data before rotation");
  const encrypted = await kms.encrypt(key.keyId, plaintext);
  console.log("\nEncrypted with original key.");

  // Step 3: Decrypt with original key (still works)
  const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext);
  console.log("Decrypted: ", new TextDecoder().decode(decrypted.plaintext));

  // Step 4: Rotate the key — generates new key material
  console.log("\n--- Rotating key ---");
  const rotated = await kms.rotateKey(key.keyId);
  console.log("Key rotated:", rotated.keyId);
  console.log("New created:", rotated.createdAt);

  // Step 5: Note — data encrypted with the old material can NOT be decrypted
  // with the new material. In production, you would re-encrypt existing data.
  console.log("\nNote: old ciphertext must be re-encrypted with the new key material.");

  // Step 6: Encrypt new data with the rotated key
  const newPlaintext = new TextEncoder().encode("Data after rotation");
  const newEncrypted = await kms.encrypt(key.keyId, newPlaintext);
  const newDecrypted = await kms.decrypt(key.keyId, newEncrypted.ciphertext);
  console.log("Re-encrypted and decrypted:", new TextDecoder().decode(newDecrypted.plaintext));

  // Step 7: Rotate a signing key
  const signKey = await kms.createKey("ed25519", "sign");
  console.log("\nCreated signing key:", signKey.keyId);

  const msg = new TextEncoder().encode("test message");
  const sig = await kms.sign(signKey.keyId, msg);
  const valid = await kms.verify(signKey.keyId, msg, sig.signature);
  console.log("Pre-rotation signature valid:", valid);

  await kms.rotateKey(signKey.keyId);
  console.log("Signing key rotated.");

  // New signatures use the new key pair
  const newSig = await kms.sign(signKey.keyId, msg);
  const newValid = await kms.verify(signKey.keyId, msg, newSig.signature);
  console.log("Post-rotation signature valid:", newValid);

  console.log("\nDone.");
}

main().catch(console.error);
