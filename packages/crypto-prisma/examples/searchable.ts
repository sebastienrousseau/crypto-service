// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Deterministic HMAC-SHA-256 encryption for exact-match search.
 *
 * Run: `npx ts-node examples/searchable.ts`
 */

import { header, task, summary } from "./support";

async function main() {
  header("crypto-prisma -- searchable encryption");

  await task("Configure deterministic fields for searchable encryption", () => {
    // import { PrismaClient } from "@prisma/client";
    // import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";
    //
    // const prisma = new PrismaClient();
    // prisma.$use(
    //   createEncryptionMiddleware({
    //     key: process.env.FIELD_ENCRYPTION_KEY!,
    //     encryptedFields: [
    //       { model: "User", fields: ["email", "phone", "ssn"] },
    //     ],
    //     // Only email is searchable; phone and ssn use random encryption
    //     deterministicFields: ["email"],
    //   })
    // );
  });

  await task("Create a user with mixed encryption modes", () => {
    // await prisma.user.create({
    //   data: {
    //     name: "Alice",
    //     email: "alice@example.com",   // deterministic HMAC
    //     phone: "+1-555-0100",          // random secretbox
    //     ssn: "123-45-6789",            // random secretbox
    //   },
    // });
  });

  await task("Search by deterministic field (exact-match WHERE)", () => {
    // const found = await prisma.user.findFirst({
    //   where: { email: "alice@example.com" },
    // });
    // console.log(found?.name); // "Alice"
  });

  await task("Understand the trade-off: deterministic fields reveal equality", () => {
    // NOTE: The email column stores a hex HMAC-SHA-256 digest, NOT the
    // original email. Deterministic fields are one-way -- you cannot
    // decrypt them back to the original value.
    //
    // For both searchability AND decryption, use two columns:
    //   email_hash      String @unique  -- deterministic (HMAC)
    //   email_encrypted String          -- non-deterministic (secretbox)
  });

  summary(4);
}

main();
