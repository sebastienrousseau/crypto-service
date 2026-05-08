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
import { header, task, summary } from "./support";

async function main() {
  header("crypto-kms -- Envelope Encryption");

  const kms = new LocalKmsProvider();

  const masterKey = await task("Create master key (KEK)", async () => {
    return kms.createKey("aes-256-gcm", "encrypt");
  });

  const dek = await task("Generate data encryption key (DEK)", async () => {
    return kms.generateDataKey(masterKey.keyId);
  });

  const envelope = await task("Encrypt data locally with DEK", async () => {
    const data = Buffer.from(
      "This is sensitive data encrypted with envelope encryption.",
    );
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dek.plaintext, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    // In production, the plaintext DEK should be zeroed from memory.
    return { iv, tag, encrypted, wrappedDek: dek.ciphertext };
  });

  await task("Unwrap DEK from master key", async () => {
    return kms.decrypt(masterKey.keyId, envelope.wrappedDek);
  });

  await task("Decrypt data locally with unwrapped DEK", async () => {
    const unwrapped = await kms.decrypt(masterKey.keyId, envelope.wrappedDek);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      unwrapped.plaintext,
      envelope.iv,
    );
    decipher.setAuthTag(envelope.tag);
    const decrypted = Buffer.concat([
      decipher.update(envelope.encrypted),
      decipher.final(),
    ]);
    return decrypted.toString();
  });

  summary(5);
}

main().catch(console.error);
