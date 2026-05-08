// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Use the LocalKmsProvider to create keys, encrypt, decrypt, sign, and verify.
 *
 * Run: `npx ts-node examples/local.ts`
 */

import { LocalKmsProvider } from "../src";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-kms -- Local Provider");

  const kms = new LocalKmsProvider();

  const encKey = await task("Create encryption key", async () => {
    return kms.createKey("aes-256-gcm", "encrypt");
  });

  const encrypted = await task("Encrypt plaintext", async () => {
    const plaintext = new TextEncoder().encode("Hello, crypto-kms!");
    return kms.encrypt(encKey.keyId, plaintext);
  });

  await task("Decrypt ciphertext", async () => {
    const decrypted = await kms.decrypt(encKey.keyId, encrypted.ciphertext);
    return new TextDecoder().decode(decrypted.plaintext);
  });

  const signKey = await task("Create signing key", async () => {
    return kms.createKey("ed25519", "sign");
  });

  const signed = await task("Sign data", async () => {
    const message = new TextEncoder().encode("Sign this message");
    return kms.sign(signKey.keyId, message);
  });

  await task("Verify signature", async () => {
    const message = new TextEncoder().encode("Sign this message");
    return kms.verify(signKey.keyId, message, signed.signature);
  });

  await task("List all keys", async () => {
    return kms.listKeys();
  });

  summary(7);
}

main().catch(console.error);
