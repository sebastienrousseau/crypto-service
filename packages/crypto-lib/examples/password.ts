// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Argon2id password hashing and verification (RFC 9106).
 *
 * Run: `npx ts-node examples/password.ts`
 */

import { hashPassword, verifyPassword, verifyPasswordPhc } from "../src";

function main() {
  console.log("\n=== crypto-lib — password ===\n");

  const password = "correct horse battery staple";

  // Hash with Argon2id (default: t=3, m=65536, p=4)
  const result = hashPassword({ password });
  console.log(`Algorithm: ${result.algorithm}`);
  console.log(`Hash:      ${result.hash.slice(0, 40)}...`);
  console.log(`Salt:      ${result.salt}`);
  console.log(`PHC:       ${result.phc}`);
  console.log(`Params:    t=${result.params.t}, m=${result.params.m}, p=${result.params.p}`);

  // Verify with structured parameters
  const { valid } = verifyPassword({
    password,
    hash: result.hash,
    salt: result.salt,
    params: result.params,
  });
  console.log(`\nVerify (correct):  ${valid}`);

  // Verify wrong password
  const { valid: wrong } = verifyPassword({
    password: "wrong password",
    hash: result.hash,
    salt: result.salt,
    params: result.params,
  });
  console.log(`Verify (wrong):    ${wrong}`);

  // Verify via PHC string (self-contained)
  const { valid: phcOk } = verifyPasswordPhc({ password, phc: result.phc });
  console.log(`Verify (PHC):      ${phcOk}`);

  console.log("\nDone.");
}

main();
