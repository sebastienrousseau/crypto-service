// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Password hashing, verification, and password-based encryption.
 *
 * Run: `npx ts-node examples/password.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — password ===\n");

  const password = "correct-horse-battery-staple";

  // Hash a password with Argon2id
  const hashed = await client.passwordHash({ password });
  console.log("Hash:     ", hashed.data.hash.slice(0, 32) + "...");
  console.log("Salt:     ", hashed.data.salt.slice(0, 16) + "...");
  console.log("PHC:      ", hashed.data.phc.slice(0, 40) + "...");
  console.log("Algorithm:", hashed.data.algorithm);

  // Verify the password
  const verified = await client.passwordVerify({
    password,
    hash: hashed.data.hash,
    salt: hashed.data.salt,
    params: hashed.data.params,
  });
  console.log("Valid:    ", verified.data.valid);

  // Password-based encryption
  const encrypted = await client.passwordEncrypt({
    password,
    plaintext: "Secret data protected by a password",
  });
  console.log("\nCiphertext:", encrypted.data.ciphertext.slice(0, 32) + "...");

  const decrypted = await client.passwordDecrypt({
    password,
    ciphertext: encrypted.data.ciphertext,
  });
  console.log("Decrypted: ", decrypted.data.plaintext);

  console.log("\nDone.");
}

main().catch(console.error);
