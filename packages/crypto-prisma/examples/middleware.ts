// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Basic middleware setup and transparent encrypt/decrypt.
 *
 * Run: `npx ts-node examples/middleware.ts`
 */

import { header, task, summary } from "./support";

async function main() {
  header("crypto-prisma -- middleware");

  await task("Attach encryption middleware to PrismaClient", () => {
    // import { PrismaClient } from "@prisma/client";
    // import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";
    //
    // const prisma = new PrismaClient();
    // prisma.$use(
    //   createEncryptionMiddleware({
    //     key: process.env.FIELD_ENCRYPTION_KEY!,
    //     encryptedFields: [
    //       { model: "User", fields: ["email", "phone", "address"] },
    //       { model: "Patient", fields: ["ssn", "diagnosis"] },
    //     ],
    //   })
    // );
  });

  await task("Create a record (fields encrypted before DB write)", () => {
    // const user = await prisma.user.create({
    //   data: {
    //     name: "Alice",
    //     email: "alice@example.com",
    //     phone: "+1-555-0100",
    //     address: "123 Main St, Springfield",
    //   },
    // });
    // console.log(user.email); // "alice@example.com" (decrypted on read)
  });

  await task("Update a record (changed fields re-encrypted)", () => {
    // const updated = await prisma.user.update({
    //   where: { id: user.id },
    //   data: { phone: "+1-555-0200" },
    // });
    // console.log(updated.phone); // "+1-555-0200"
  });

  await task("Read records (all configured fields decrypted)", () => {
    // const users = await prisma.user.findMany();
    // for (const u of users) {
    //   console.log(u.name, u.email); // plaintext
    // }
  });

  await task("Upsert a record (create/update branches both encrypt)", () => {
    // const upserted = await prisma.user.upsert({
    //   where: { id: 999 },
    //   create: {
    //     name: "Bob",
    //     email: "bob@example.com",
    //     phone: "+1-555-0300",
    //     address: "456 Oak Ave",
    //   },
    //   update: { email: "bob-updated@example.com" },
    // });
    // console.log(upserted.email); // plaintext
  });

  summary(5);
}

main();
