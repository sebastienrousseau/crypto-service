// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Migrate existing plaintext data to encrypted storage without downtime.
 *
 * Run: `npx ts-node examples/migration.ts`
 */

import { header, task, summary } from "./support";

async function main() {
  header("crypto-prisma -- migration");

  await task("Enable encryption middleware (handles both plaintext and ciphertext)", () => {
    // import { PrismaClient } from "@prisma/client";
    // import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";
    //
    // const prisma = new PrismaClient();
    // const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY!;
    //
    // prisma.$use(
    //   createEncryptionMiddleware({
    //     key: ENCRYPTION_KEY,
    //     encryptedFields: [
    //       { model: "User", fields: ["email", "phone"] },
    //     ],
    //   })
    // );
    // Reads will gracefully return plaintext for un-migrated rows.
  });

  await task("Detect already-encrypted values via base64 heuristic", () => {
    // function isBase64Blob(value: string): boolean {
    //   if (value.length < 54) return false; // base64 of 40B min
    //   try {
    //     const buf = Buffer.from(value, "base64");
    //     return buf.toString("base64") === value;
    //   } catch {
    //     return false;
    //   }
    // }
  });

  await task("Batch-migrate rows using raw queries to bypass middleware", () => {
    // import { secretbox } from "@sebastienrousseau/crypto-lib";
    //
    // let migrated = 0;
    // let cursor: number | undefined;
    //
    // while (true) {
    //   const rows = await prisma.$queryRaw<
    //     Array<{ id: number; email: string; phone: string | null }>
    //   >`SELECT id, email, phone FROM "User"
    //     ${cursor ? Prisma.sql`WHERE id > ${cursor}` : Prisma.empty}
    //     ORDER BY id ASC LIMIT 100`;
    //
    //   if (rows.length === 0) break;
    //
    //   for (const row of rows) {
    //     if (isBase64Blob(row.email)) { cursor = row.id; continue; }
    //     const encEmail = secretbox.seal(ENCRYPTION_KEY, row.email).sealed;
    //     const encPhone = row.phone
    //       ? secretbox.seal(ENCRYPTION_KEY, row.phone).sealed
    //       : null;
    //     await prisma.$executeRaw`
    //       UPDATE "User" SET email = ${encEmail}, phone = ${encPhone}
    //       WHERE id = ${row.id}`;
    //     migrated++;
    //     cursor = row.id;
    //   }
    // }
  });

  await task("Verify migration complete", () => {
    // console.log(`Migration complete: ${migrated} rows encrypted.`);
    // await prisma.$disconnect();
  });

  summary(4);
}

main();
