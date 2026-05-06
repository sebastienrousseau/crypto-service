// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Unified crypto API: a single namespace for all common operations.
 * Covers encryption, hashing, signing, key generation, password hashing,
 * HMAC, and algorithm registry queries.
 *
 * Run: `npx ts-node examples/unified.ts`
 */

import { crypto } from "../src";

function main() {
  console.log("\n=== crypto-lib — unified ===\n");

  // --- Random Key ---
  const key = crypto.randomKey();
  console.log(`Random key: ${key.slice(0, 16)}... (${key.length / 2} bytes)`);

  // --- Encrypt / Decrypt (secretbox) ---
  const ct = crypto.encrypt(key, "Hello from the unified API!");
  const pt = crypto.decrypt(key, ct);
  console.log(`Encrypt/Decrypt: ${Buffer.from(pt).toString("utf8")}`);

  // --- Hash ---
  const digest = crypto.hash("sha3-256", "data to hash");
  console.log(`SHA3-256: ${digest}`);

  // --- Key Generation ---
  const ed = crypto.generateKeyPair("ed25519");
  console.log(`Ed25519 kid: ${ed.kid}`);

  const mlDsa = crypto.generateKeyPair("ml-dsa-65");
  console.log(`ML-DSA-65 kid: ${mlDsa.kid}`);

  // --- Sign / Verify (Ed25519) ---
  const sig = crypto.sign("ed25519", ed.privateKey, "sign me");
  const valid = crypto.verify("ed25519", ed.publicKey, "sign me", sig);
  console.log(`Ed25519 sign/verify: ${valid}`);

  // --- Sign / Verify (ML-DSA-65) ---
  const pqSig = crypto.sign("ml-dsa-65", mlDsa.privateKey, "pq-sign me");
  const pqValid = crypto.verify("ml-dsa-65", mlDsa.publicKey, "pq-sign me", pqSig);
  console.log(`ML-DSA-65 sign/verify: ${pqValid}`);

  // --- Password Hashing ---
  const pwResult = crypto.hashPassword("my-password");
  const pwOk = crypto.verifyPasswordPhc("my-password", pwResult.phc);
  console.log(`Password hash/verify: ${pwOk.valid}`);

  // --- HMAC ---
  const mac = crypto.hmac("sha256", key, "authenticate me");
  const macOk = crypto.hmacVerify("sha256", key, "authenticate me", mac);
  console.log(`HMAC compute/verify: ${macOk}`);

  // --- Registry ---
  const rec = crypto.registry.recommended("kem");
  console.log(`\nRecommended KEM algorithms:`);
  for (const r of rec) {
    console.log(`  ${r.id} (Level ${r.securityLevel})`);
  }

  const deprecated = crypto.registry.isDeprecated("pbkdf2-sha256");
  console.log(`\npbkdf2-sha256 deprecated: ${deprecated}`);

  console.log("\nDone.");
}

main();
