// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key derivation with scrypt (RFC 7914) and HKDF-SHA256 (RFC 5869).
 *
 * Run: `npx ts-node examples/kdf.ts`
 */

import { kdfDerive } from "../src";

function main() {
  console.log("\n=== crypto-lib — kdf ===\n");

  const password = "my-secret-password";

  // scrypt: derive a 256-bit key from a password
  const scryptResult = kdfDerive({
    algorithm: "scrypt",
    password,
    params: { N: 16384, r: 8, p: 1 },
  });
  console.log("scrypt (RFC 7914):");
  console.log(`  Derived key: ${scryptResult.derivedKey}`);
  console.log(`  Salt:        ${scryptResult.salt}`);
  console.log(`  Key length:  ${scryptResult.keyLength} bytes`);

  // HKDF-SHA256: extract and expand keying material
  const hkdfResult = kdfDerive({
    algorithm: "hkdf-sha256",
    password: "input-keying-material",
    salt: scryptResult.salt,
    params: { info: "example-context" },
    keyLength: 32,
  });
  console.log("\nHKDF-SHA256 (RFC 5869):");
  console.log(`  Derived key: ${hkdfResult.derivedKey}`);
  console.log(`  Key length:  ${hkdfResult.keyLength} bytes`);

  // PBKDF2-SHA256: legacy KDF (deprecated, prefer Argon2id or scrypt)
  const pbkdf2Result = kdfDerive({
    algorithm: "pbkdf2-sha256",
    password,
    params: { iterations: 100000 },
  });
  console.log("\nPBKDF2-SHA256 (RFC 8018, deprecated):");
  console.log(`  Derived key: ${pbkdf2Result.derivedKey}`);

  console.log("\nDone.");
}

main();
