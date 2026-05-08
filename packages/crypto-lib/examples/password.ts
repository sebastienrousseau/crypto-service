// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Argon2id password hashing and verification (RFC 9106).
 *
 * Run: `npx ts-node examples/password.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { hashPassword, verifyPassword, verifyPasswordPhc } from "../src";

async function main() {
  header("crypto-lib -- password");

  const password = "correct horse battery staple";

  const result = await taskWithOutput("Hash with Argon2id (t=3, m=65536, p=4)", () => {
    const r = hashPassword({ password });
    return [
      `algorithm: ${r.algorithm}`,
      `hash:      ${r.hash.slice(0, 40)}...`,
      `salt:      ${r.salt}`,
      `PHC:       ${r.phc.slice(0, 60)}...`,
    ];
  });

  const hashed = hashPassword({ password });

  await task("Verify correct password", () => {
    const { valid } = verifyPassword({
      password,
      hash: hashed.hash,
      salt: hashed.salt,
      params: hashed.params,
    });
    if (!valid) throw new Error("Should be valid");
  });

  await task("Reject wrong password", () => {
    const { valid } = verifyPassword({
      password: "wrong password",
      hash: hashed.hash,
      salt: hashed.salt,
      params: hashed.params,
    });
    if (valid) throw new Error("Should be invalid");
  });

  await task("Verify via PHC string", () => {
    const { valid } = verifyPasswordPhc({ password, phc: hashed.phc });
    if (!valid) throw new Error("PHC verification failed");
  });

  summary(4);
}

main();
