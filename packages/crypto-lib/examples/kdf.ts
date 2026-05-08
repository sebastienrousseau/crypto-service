// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key derivation with scrypt (RFC 7914) and HKDF-SHA256 (RFC 5869).
 *
 * Run: `npx ts-node examples/kdf.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { kdfDerive } from "../src";

async function main() {
  header("crypto-lib -- kdf");

  const password = "my-secret-password";

  const scryptResult = await taskWithOutput("Derive key with scrypt (RFC 7914)", () => {
    const r = kdfDerive({ algorithm: "scrypt", password, params: { N: 16384, r: 8, p: 1 } });
    return [`key: ${r.derivedKey.slice(0, 40)}...`, `salt: ${r.salt}`, `length: ${r.keyLength} bytes`];
  });

  await taskWithOutput("Derive key with HKDF-SHA256 (RFC 5869)", () => {
    const r = kdfDerive({
      algorithm: "hkdf-sha256",
      password: "input-keying-material",
      params: { info: "example-context" },
      keyLength: 32,
    });
    return [`key: ${r.derivedKey.slice(0, 40)}...`, `length: ${r.keyLength} bytes`];
  });

  await taskWithOutput("Derive key with PBKDF2-SHA256 (RFC 8018)", () => {
    const r = kdfDerive({ algorithm: "pbkdf2-sha256", password, params: { iterations: 100000 } });
    return [`key: ${r.derivedKey.slice(0, 40)}...`];
  });

  summary(3);
}

main();
