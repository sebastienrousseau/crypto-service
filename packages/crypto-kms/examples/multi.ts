// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Use multiple KMS providers with provider-agnostic code.
 *
 * Demonstrates how the KmsProvider interface enables writing code that
 * works across any backend — cloud or local.
 *
 * Run: `npx ts-node examples/multi.ts`
 */

import { LocalKmsProvider } from "../src";
import type { KmsProvider } from "../src";

/**
 * Provider-agnostic function that creates a key, encrypts, and decrypts.
 * Works with any KmsProvider implementation.
 */
async function roundTrip(provider: KmsProvider, label: string): Promise<void> {
  console.log(`\n--- ${label} (${provider.name}) ---`);

  // Create key
  const key = await provider.createKey("aes-256-gcm", "encrypt");
  console.log("Key:", key.keyId);

  // Encrypt
  const plaintext = new TextEncoder().encode(`Hello from ${label}!`);
  const encrypted = await provider.encrypt(key.keyId, plaintext);
  console.log("Encrypted:", encrypted.ciphertext.slice(0, 30) + "...");

  // Decrypt
  const decrypted = await provider.decrypt(key.keyId, encrypted.ciphertext);
  console.log("Decrypted:", new TextDecoder().decode(decrypted.plaintext));

  // List keys
  const keys = await provider.listKeys();
  console.log("Total keys:", keys.length);
}

/**
 * Provider-agnostic function for signing operations.
 */
async function signRoundTrip(provider: KmsProvider, label: string): Promise<void> {
  console.log(`\n--- ${label} signing (${provider.name}) ---`);

  const key = await provider.createKey("ed25519", "sign");
  const message = new TextEncoder().encode("Provider-agnostic signing");

  const signed = await provider.sign(key.keyId, message);
  console.log("Signature:", signed.signature.slice(0, 30) + "...");

  const valid = await provider.verify(key.keyId, message, signed.signature);
  console.log("Valid:", valid);
}

async function main() {
  console.log("\n=== crypto-kms — multi-provider ===\n");

  // Create multiple providers
  // In production, you might use AwsKmsProvider, GcpKmsProvider, etc.
  const providers: Array<{ provider: KmsProvider; label: string }> = [
    { provider: new LocalKmsProvider(), label: "Local-A" },
    { provider: new LocalKmsProvider(), label: "Local-B" },
    // Uncomment when cloud credentials are configured:
    // { provider: new AwsKmsProvider({ region: "us-east-1" }), label: "AWS" },
    // { provider: new GcpKmsProvider({ projectId: "...", locationId: "...", keyRingId: "..." }), label: "GCP" },
    // { provider: new AzureKmsProvider({ vaultUrl: "https://..." }), label: "Azure" },
  ];

  // Run the same provider-agnostic code against each backend
  for (const { provider, label } of providers) {
    await roundTrip(provider, label);
    await signRoundTrip(provider, label);
  }

  // Demonstrate key lifecycle across providers
  console.log("\n--- Key lifecycle ---");
  const kms = new LocalKmsProvider();
  const key = await kms.createKey("aes-256-gcm", "encrypt");
  console.log("Created:", key.keyId, "enabled:", key.enabled);

  await kms.disableKey(key.keyId);
  const disabled = await kms.getKey(key.keyId);
  console.log("Disabled:", disabled.keyId, "enabled:", disabled.enabled);

  await kms.enableKey(key.keyId);
  const enabled = await kms.getKey(key.keyId);
  console.log("Enabled: ", enabled.keyId, "enabled:", enabled.enabled);

  await kms.scheduleKeyDeletion(key.keyId, 7);
  console.log("Scheduled for deletion (7 days).");

  console.log("\nDone.");
}

main().catch(console.error);
