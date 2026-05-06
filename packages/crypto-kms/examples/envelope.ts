// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Envelope encryption pattern using generateDataKey.
 *
 * Envelope encryption generates a data encryption key (DEK) that is used
 * locally for fast symmetric encryption, while the DEK itself is wrapped
 * (encrypted) by the KMS master key. Only the wrapped DEK is stored
 * alongside the ciphertext.
 *
 * Run: `npx ts-node examples/envelope.ts`
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { LocalKmsProvider } from "../src";

async function main() {
  console.log("\n=== crypto-kms — envelope encryption ===\n");

  const kms = new LocalKmsProvider();

  // Step 1: Create a master key (KEK — key encryption key)
  const masterKey = await kms.createKey("aes-256-gcm", "encrypt");
  console.log("Master key (KEK):", masterKey.keyId);

  // Step 2: Generate a data encryption key (DEK)
  const { plaintext: dekPlaintext, ciphertext: wrappedDek } =
    await kms.generateDataKey(masterKey.keyId);
  console.log("DEK generated and wrapped.");
  console.log("Wrapped DEK (base64):", wrappedDek.slice(0, 40) + "...");

  // Step 3: Encrypt data locally using the plaintext DEK
  const data = Buffer.from("This is sensitive data encrypted with envelope encryption.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dekPlaintext, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  console.log("\nData encrypted locally with DEK.");
  console.log("Ciphertext length:", encrypted.length, "bytes");

  // Step 4: Store { iv, tag, encrypted, wrappedDek } — the plaintext DEK is discarded.
  // In production, the plaintext DEK should be zeroed from memory after encryption.
  const envelope = { iv, tag, encrypted, wrappedDek };

  // --- Later, to decrypt ---

  // Step 5: Unwrap the DEK using the master key
  const unwrapped = await kms.decrypt(masterKey.keyId, envelope.wrappedDek);
  console.log("\nDEK unwrapped from master key.");

  // Step 6: Decrypt data locally using the unwrapped DEK
  const decipher = createDecipheriv("aes-256-gcm", unwrapped.plaintext, envelope.iv);
  decipher.setAuthTag(envelope.tag);
  const decrypted = Buffer.concat([decipher.update(envelope.encrypted), decipher.final()]);

  console.log("Decrypted:", decrypted.toString());

  console.log("\nDone.");
}

main().catch(console.error);
