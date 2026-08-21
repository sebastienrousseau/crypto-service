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
import { header, task, summary } from "./support";

async function main() {
  header("crypto-kms -- Key Rotation");

  const kms = new LocalKmsProvider();

  const key = await task("Create encryption key", async () => {
    return kms.createKey("aes-256-gcm", "encrypt");
  });

  const encrypted = await task("Encrypt data with original key", async () => {
    const plaintext = new TextEncoder().encode("Data before rotation");
    return kms.encrypt(key.keyId, plaintext);
  });

  await task("Decrypt with original key", async () => {
    const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext);
    return new TextDecoder().decode(decrypted.plaintext);
  });

  await task("Rotate encryption key material", async () => {
    return kms.rotateKey(key.keyId);
  });

  await task("Re-encrypt and decrypt with rotated key", async () => {
    const newPlaintext = new TextEncoder().encode("Data after rotation");
    const newEncrypted = await kms.encrypt(key.keyId, newPlaintext);
    const newDecrypted = await kms.decrypt(key.keyId, newEncrypted.ciphertext);
    return new TextDecoder().decode(newDecrypted.plaintext);
  });

  const signKey = await task("Create signing key", async () => {
    return kms.createKey("ed25519", "sign");
  });

  await task("Sign and verify before rotation", async () => {
    const msg = new TextEncoder().encode("test message");
    const sig = await kms.sign(signKey.keyId, msg);
    return kms.verify(signKey.keyId, msg, sig.signature);
  });

  await task("Rotate signing key", async () => {
    return kms.rotateKey(signKey.keyId);
  });

  await task("Sign and verify after rotation", async () => {
    const msg = new TextEncoder().encode("test message");
    const sig = await kms.sign(signKey.keyId, msg);
    return kms.verify(signKey.keyId, msg, sig.signature);
  });

  summary(9);
}

main().catch(console.error);
