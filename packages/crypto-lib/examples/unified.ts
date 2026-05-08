// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Unified crypto API: a single namespace for all common operations.
 *
 * Run: `npx ts-node examples/unified.ts`
 */

import { header, task, summary } from "./support";
import { crypto } from "../src";

async function main() {
  header("crypto-lib -- unified");

  const key = await task("Generate random key", () => crypto.randomKey());

  await task("Encrypt and decrypt (secretbox)", () => {
    const ct = crypto.encrypt(key, "Hello from the unified API!");
    const pt = crypto.decrypt(key, ct);
    if (Buffer.from(pt).toString("utf8") !== "Hello from the unified API!") throw new Error("Mismatch");
  });

  await task("Hash with SHA3-256", () => {
    crypto.hash("sha3-256", "data to hash");
  });

  await task("Generate Ed25519 key pair and sign/verify", () => {
    const ed = crypto.generateKeyPair("ed25519");
    const sig = crypto.sign("ed25519", ed.privateKey, "sign me");
    const valid = crypto.verify("ed25519", ed.publicKey, "sign me", sig);
    if (!valid) throw new Error("Verification failed");
  });

  await task("Generate ML-DSA-65 key pair and sign/verify", () => {
    const mlDsa = crypto.generateKeyPair("ml-dsa-65");
    const sig = crypto.sign("ml-dsa-65", mlDsa.privateKey, "pq-sign me");
    const valid = crypto.verify("ml-dsa-65", mlDsa.publicKey, "pq-sign me", sig);
    if (!valid) throw new Error("Verification failed");
  });

  await task("Hash and verify password (Argon2id)", () => {
    const result = crypto.hashPassword("my-password");
    const { valid } = crypto.verifyPasswordPhc("my-password", result.phc);
    if (!valid) throw new Error("Verification failed");
  });

  await task("Compute and verify HMAC-SHA256", () => {
    const mac = crypto.hmac("sha256", key, "authenticate me");
    const ok = crypto.hmacVerify("sha256", key, "authenticate me", mac);
    if (!ok) throw new Error("Verification failed");
  });

  summary(7);
}

main();
