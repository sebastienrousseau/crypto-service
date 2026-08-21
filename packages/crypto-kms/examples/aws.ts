// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * AWS KMS provider setup and usage pattern.
 *
 * Demonstrates creating keys, encrypting/decrypting data, listing keys,
 * rotating key material, and scheduling deletion via the AWS KMS backend.
 *
 * Run: `npx ts-node examples/aws.ts`
 * Requires: @aws-sdk/client-kms installed, valid AWS credentials configured.
 */

import { AwsKmsProvider } from "../src";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-kms -- AWS KMS");

  const kms = await task("Initialise AWS KMS provider", async () => {
    return new AwsKmsProvider({
      region: process.env.AWS_REGION ?? "us-east-1",
      // Credentials are loaded from the default AWS credential chain.
      // Override for LocalStack or testing:
      // endpoint: "http://localhost:4566",
      // credentials: { accessKeyId: "test", secretAccessKey: "test" },
    });
  });

  const key = await task("Create symmetric encryption key", async () => {
    return kms.createKey("SYMMETRIC_DEFAULT", "encrypt", {
      Environment: "development",
      Application: "crypto-kms-example",
    });
  });

  await task("Encrypt data", async () => {
    const plaintext = new TextEncoder().encode("Sensitive data for AWS KMS");
    return kms.encrypt(key.keyId, plaintext, { purpose: "example" });
  });

  const encrypted = await kms.encrypt(
    key.keyId,
    new TextEncoder().encode("Sensitive data for AWS KMS"),
    { purpose: "example" },
  );

  await task("Decrypt data", async () => {
    const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext, {
      purpose: "example",
    });
    return new TextDecoder().decode(decrypted.plaintext);
  });

  await task("List managed keys", async () => {
    return kms.listKeys();
  });

  await task("Describe key metadata", async () => {
    return kms.getKey(key.keyId);
  });

  await task("Rotate key material", async () => {
    return kms.rotateKey(key.keyId);
  });

  await task("Schedule key deletion (30-day window)", async () => {
    return kms.scheduleKeyDeletion(key.keyId, 30);
  });

  summary(8);
}

main().catch(console.error);
