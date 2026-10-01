// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Password hashing, verification, and password-based encryption.
 *
 * Run: `npx ts-node examples/password.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { header, task, summary, createClient } from "./support";

const client = createClient();

async function main() {
  header("crypto-sdk -- password");

  const password = "correct-horse-battery-staple";

  const hashed = await task("Hash password with Argon2id", async () => {
    return client.passwordHash({ password });
  });

  await task("Verify password hash", async () => {
    const { data } = await client.passwordVerify({
      password,
      hash: hashed.data.hash,
      salt: hashed.data.salt,
      params: hashed.data.params,
    });
    if (!data.valid) {
      throw new Error("Password verification failed");
    }
  });

  const encrypted = await task("Encrypt data with password", async () => {
    return client.passwordEncrypt({
      password,
      plaintext: "Secret data protected by a password",
    });
  });

  await task("Decrypt password-encrypted data", async () => {
    const { data } = await client.passwordDecrypt({
      password,
      ciphertext: encrypted.data.encrypted,
    });
    return data;
  });

  summary(4);
}

main().catch(console.error);
