// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Client Extension approach for field-level encryption (Prisma 4.16+).
 *
 * Run: `npx ts-node examples/extension.ts`
 */

import { header, task, summary } from "./support";

async function main() {
  header("crypto-prisma -- extension");

  await task("Create an extended PrismaClient with field encryption", () => {
    // import { PrismaClient } from "@prisma/client";
    // import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";
    //
    // const basePrisma = new PrismaClient();
    // const prisma = basePrisma.$extends(
    //   createFieldEncryptionExtension({
    //     key: process.env.FIELD_ENCRYPTION_KEY!,
    //     encryptedFields: [
    //       { model: "User", fields: ["email", "phone"] },
    //       { model: "CreditCard", fields: ["number", "cvv"] },
    //     ],
    //   })
    // );
  });

  await task("Create a credit card (number + cvv encrypted)", () => {
    // const card = await prisma.creditCard.create({
    //   data: {
    //     userId: 1,
    //     number: "4111-1111-1111-1111",
    //     cvv: "123",
    //     expiry: "12/28",
    //   },
    // });
    // console.log(card.number); // "4111-1111-1111-1111" (decrypted)
    // In the database: base64 XChaCha20-Poly1305 ciphertext
  });

  await task("Read back the record (fields decrypted transparently)", () => {
    // const found = await prisma.creditCard.findFirst({
    //   where: { userId: 1 },
    // });
    // console.log(found?.number); // "4111-1111-1111-1111"
  });

  await task("Compose with other extensions", () => {
    // const prismaWithLogging = basePrisma
    //   .$extends(createFieldEncryptionExtension({ ... }))
    //   .$extends(loggingExtension());
  });

  summary(4);
}

main();
