// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Use multiple KMS providers with provider-agnostic code.
 *
 * Demonstrates how the KmsProvider interface enables writing code that
 * works across any backend -- cloud or local.
 *
 * Run: `npx ts-node examples/multi.ts`
 */

import { LocalKmsProvider } from "../src";
import type { KmsProvider } from "../src";
import { header, task, summary } from "./support";

/**
 * Provider-agnostic function that creates a key, encrypts, and decrypts.
 * Works with any KmsProvider implementation.
 */
async function roundTrip(provider: KmsProvider, label: string): Promise<void> {
  const key = await task(`${label} -- create encryption key`, async () => {
    return provider.createKey("aes-256-gcm", "encrypt");
  });

  const encrypted = await task(`${label} -- encrypt data`, async () => {
    const plaintext = new TextEncoder().encode(`Hello from ${label}!`);
    return provider.encrypt(key.keyId, plaintext);
  });

  await task(`${label} -- decrypt data`, async () => {
    const decrypted = await provider.decrypt(key.keyId, encrypted.ciphertext);
    return new TextDecoder().decode(decrypted.plaintext);
  });
}

/**
 * Provider-agnostic function for signing operations.
 */
async function signRoundTrip(
  provider: KmsProvider,
  label: string,
): Promise<void> {
  const key = await task(`${label} -- create signing key`, async () => {
    return provider.createKey("ed25519", "sign");
  });

  const signed = await task(`${label} -- sign message`, async () => {
    const message = new TextEncoder().encode("Provider-agnostic signing");
    return provider.sign(key.keyId, message);
  });

  await task(`${label} -- verify signature`, async () => {
    const message = new TextEncoder().encode("Provider-agnostic signing");
    return provider.verify(key.keyId, message, signed.signature);
  });
}

async function main() {
  header("crypto-kms -- Multi-Provider");

  // Create multiple providers.
  // In production, you might use AwsKmsProvider, GcpKmsProvider, etc.
  const providers: Array<{ provider: KmsProvider; label: string }> = [
    { provider: new LocalKmsProvider(), label: "Local-A" },
    { provider: new LocalKmsProvider(), label: "Local-B" },
    // Uncomment when cloud credentials are configured:
    // { provider: new AwsKmsProvider({ region: "us-east-1" }), label: "AWS" },
    // { provider: new GcpKmsProvider({ projectId: "...", locationId: "...", keyRingId: "..." }), label: "GCP" },
    // { provider: new AzureKmsProvider({ vaultUrl: "https://..." }), label: "Azure" },
  ];

  for (const { provider, label } of providers) {
    await roundTrip(provider, label);
    await signRoundTrip(provider, label);
  }

  await task("Key lifecycle -- create, disable, enable, schedule deletion", async () => {
    const kms = new LocalKmsProvider();
    const key = await kms.createKey("aes-256-gcm", "encrypt");
    await kms.disableKey(key.keyId);
    await kms.enableKey(key.keyId);
    await kms.scheduleKeyDeletion(key.keyId, 7);
    return key.keyId;
  });

  summary(13);
}

main().catch(console.error);
