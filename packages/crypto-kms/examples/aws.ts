// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * AWS KMS provider setup and usage pattern.
 *
 * Run: `npx ts-node examples/aws.ts`
 * Requires: @aws-sdk/client-kms installed, valid AWS credentials configured.
 */

import { AwsKmsProvider } from "../src";

async function main() {
  console.log("\n=== crypto-kms — AWS KMS ===\n");

  // Initialize the AWS KMS provider
  const kms = new AwsKmsProvider({
    region: process.env.AWS_REGION ?? "us-east-1",
    // Credentials are loaded from the default AWS credential chain.
    // Override for LocalStack or testing:
    // endpoint: "http://localhost:4566",
    // credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });

  // Create a symmetric encryption key
  const key = await kms.createKey("SYMMETRIC_DEFAULT", "encrypt", {
    Environment: "development",
    Application: "crypto-kms-example",
  });
  console.log("Created key:", key.keyId);

  // Encrypt data
  const plaintext = new TextEncoder().encode("Sensitive data for AWS KMS");
  const encrypted = await kms.encrypt(key.keyId, plaintext, {
    purpose: "example",
  });
  console.log("Encrypted (base64):", encrypted.ciphertext.slice(0, 40) + "...");

  // Decrypt data
  const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext, {
    purpose: "example",
  });
  console.log("Decrypted:         ", new TextDecoder().decode(decrypted.plaintext));

  // List keys
  const keys = await kms.listKeys();
  console.log("\nManaged keys:", keys.length);

  // Describe a key
  const info = await kms.getKey(key.keyId);
  console.log("Key info:", JSON.stringify(info, null, 2));

  // Enable key rotation
  const rotated = await kms.rotateKey(key.keyId);
  console.log("\nKey rotation enabled for:", rotated.keyId);

  // Schedule deletion (30-day window)
  await kms.scheduleKeyDeletion(key.keyId, 30);
  console.log("Key scheduled for deletion.");

  console.log("\nDone.");
}

main().catch(console.error);
