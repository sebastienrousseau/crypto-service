// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * HPKE (Hybrid Public Key Encryption, RFC 9180): seal and open messages
 * using ephemeral key encapsulation with various cipher suites and modes.
 *
 * Demonstrates:
 * - Key pair generation (X25519 and P-256 KEMs)
 * - Base mode seal/open
 * - PSK mode seal/open
 * - Additional authenticated data (AAD)
 * - Info context binding
 * - Different cipher suites (ChaCha20-Poly1305, AES-128-GCM)
 *
 * Run: `npx ts-node examples/hpke.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { hpkeGenerateKeyPair, hpkeSeal, hpkeOpen } from "../src";

async function main() {
  header("crypto-lib -- hpke");

  // 1. X25519 key pair generation
  const x25519Kp = await task("Generate X25519 key pair", () => {
    const kp = hpkeGenerateKeyPair("x25519");
    if (kp.publicKey.length !== 64) throw new Error("Expected 32-byte (64 hex) public key");
    if (kp.privateKey.length !== 64) throw new Error("Expected 32-byte (64 hex) private key");
    return kp;
  });

  // 2. P-256 key pair generation
  const p256Kp = await task("Generate P-256 key pair", () => {
    const kp = hpkeGenerateKeyPair("p256");
    if (kp.publicKey.length !== 130) throw new Error("Expected 65-byte (130 hex) uncompressed P-256 public key");
    return kp;
  });

  // 3. Base mode seal/open with X25519 + ChaCha20-Poly1305 (default suite)
  await task("Base mode: X25519 + ChaCha20-Poly1305 round-trip", () => {
    const plaintext = Buffer.from("Hello, HPKE!").toString("hex");
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: x25519Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
    });
    if (opened.plaintext !== plaintext) throw new Error("Decryption mismatch");
  });

  // 4. Base mode with X25519 + AES-128-GCM
  await task("Base mode: X25519 + AES-128-GCM round-trip", () => {
    const plaintext = Buffer.from("AES-GCM suite test").toString("hex");
    const suite = { kem: "x25519" as const, aead: "aes-128-gcm" as const };
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
      suite,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: x25519Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
      suite,
    });
    if (opened.plaintext !== plaintext) throw new Error("Decryption mismatch");
  });

  // 5. Base mode with P-256 + AES-128-GCM
  await task("Base mode: P-256 + AES-128-GCM round-trip", () => {
    const plaintext = Buffer.from("P-256 HPKE test").toString("hex");
    const suite = { kem: "p256" as const, aead: "aes-128-gcm" as const };
    const sealed = hpkeSeal({
      recipientPublicKey: p256Kp.publicKey,
      plaintext,
      suite,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: p256Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
      suite,
    });
    if (opened.plaintext !== plaintext) throw new Error("Decryption mismatch");
  });

  // 6. Seal with AAD (additional authenticated data)
  await task("Seal/open with AAD", () => {
    const plaintext = Buffer.from("authenticated context").toString("hex");
    const aad = Buffer.from("channel-id:42").toString("hex");
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
      aad,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: x25519Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
      aad,
    });
    if (opened.plaintext !== plaintext) throw new Error("Decryption mismatch with AAD");
  });

  // 7. Seal with info (context binding)
  await task("Seal/open with info context", () => {
    const plaintext = Buffer.from("info-bound message").toString("hex");
    const info = Buffer.from("application-context-v1").toString("hex");
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
      info,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: x25519Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
      info,
    });
    if (opened.plaintext !== plaintext) throw new Error("Decryption mismatch with info");
  });

  // 8. PSK mode
  await task("PSK mode: seal/open with pre-shared key", () => {
    const plaintext = Buffer.from("PSK-authenticated message").toString("hex");
    const psk = {
      psk: "aa".repeat(32), // 32-byte PSK
      pskId: Buffer.from("my-psk-id").toString("hex"),
    };
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
      psk,
    });
    const opened = hpkeOpen({
      recipientPrivateKey: x25519Kp.privateKey,
      encapsulatedKey: sealed.encapsulatedKey,
      ciphertext: sealed.ciphertext,
      psk,
    });
    if (opened.plaintext !== plaintext) throw new Error("PSK mode decryption mismatch");
  });

  // 9. Error case: wrong private key
  await taskResult("Error: open with wrong key fails", () => {
    const plaintext = Buffer.from("secret").toString("hex");
    const sealed = hpkeSeal({
      recipientPublicKey: x25519Kp.publicKey,
      plaintext,
    });
    const wrongKp = hpkeGenerateKeyPair("x25519");
    try {
      hpkeOpen({
        recipientPrivateKey: wrongKp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
      });
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: decryption failure with wrong key
    }
  });

  summary(9);
}

main();
