// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using pre-built test fixtures.
 *
 * Fixture generators create complete, ready-to-use test data in one
 * call. They combine deterministic keys, mock operations, and known
 * test vectors so you can focus on testing your own code.
 *
 * Run: `npx ts-node examples/fixtures.ts`
 */

import {
  createTestKeyring,
  createTestEncryptedMessage,
  createTestSignedMessage,
  createTestPasswordHash,
} from "@sebastienrousseau/crypto-testing";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-testing -- test fixtures");

  await task("Create a full test keyring", () => {
    const keyring = createTestKeyring();
    if (!keyring.signing.publicKey) throw new Error("Missing signing key");
    if (!keyring.exchange.publicKey) throw new Error("Missing exchange key");
    if (!keyring.ecdsa.publicKey) throw new Error("Missing ECDSA key");
    if (!keyring.symmetric) throw new Error("Missing symmetric key");
    if (!keyring.hmac) throw new Error("Missing HMAC key");
  });

  await task("Create a pre-encrypted message (default plaintext)", () => {
    const encrypted = createTestEncryptedMessage();
    if (!encrypted.ciphertext) throw new Error("Missing ciphertext");
    if (encrypted.algorithm !== "mock-xor") throw new Error("Wrong algorithm");
  });

  await task("Create a pre-encrypted message (custom plaintext)", () => {
    const encrypted = createTestEncryptedMessage("my secret data");
    if (encrypted.plaintext !== "my secret data") throw new Error("Wrong plaintext");
  });

  await task("Create a pre-signed message (Ed25519)", () => {
    const signed = createTestSignedMessage();
    if (!signed.signature) throw new Error("Missing signature");
    if (signed.algorithm !== "ed25519") throw new Error("Wrong algorithm");
  });

  await task("Create a pre-signed message (P-256)", () => {
    const signed = createTestSignedMessage("p256");
    if (signed.algorithm !== "p256") throw new Error("Wrong algorithm");
  });

  await task("Create a pre-hashed password (default)", () => {
    const pwHash = createTestPasswordHash();
    if (!pwHash.hash) throw new Error("Missing hash");
    if (!pwHash.phc) throw new Error("Missing PHC string");
  });

  await task("Create a pre-hashed password (custom)", () => {
    const pwHash = createTestPasswordHash("hunter2");
    if (!pwHash.phc.startsWith("$mock-argon2id$")) throw new Error("Bad PHC");
  });

  summary(7);
}

main();
