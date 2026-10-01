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

  await task("Enable encryption with the plaintext fallback switched on", () => {
    // import { PrismaClient } from "@prisma/client";
    // import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";
    //
    // const prisma = new PrismaClient().$extends(
    //   createFieldEncryptionExtension({
    //     key: process.env.FIELD_ENCRYPTION_KEY!,
    //     encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
    //     // Only while the migration runs: rows that still hold plaintext
    //     // are returned as-is instead of throwing FieldDecryptionError.
    //     // A tampered "v2:" value is rejected even with this switched on.
    //     allowPlaintextFallback: true,
    //   }),
    // );
  });

  await task("Re-write every row through the extension", () => {
    // Reading decrypts v2 and legacy ciphertexts and passes plaintext
    // through; writing the value back seals it in the v2 format, bound
    // to User.email / User.phone.
    //
    // let cursor: number | undefined;
    // let migrated = 0;
    // for (;;) {
    //   const rows = await prisma.user.findMany({
    //     take: 100,
    //     ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    //     orderBy: { id: "asc" },
    //     select: { id: true, email: true, phone: true },
    //   });
    //   if (rows.length === 0) break;
    //   for (const row of rows) {
    //     await prisma.user.update({
    //       where: { id: row.id },
    //       data: { email: row.email, phone: row.phone },
    //     });
    //     migrated++;
    //     cursor = row.id;
    //   }
    // }
  });

  await task("Switch the fallbacks off once every row is rewritten", () => {
    // createFieldEncryptionExtension({
    //   key: process.env.FIELD_ENCRYPTION_KEY!,
    //   encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
    //   // allowPlaintextFallback defaults to false: plaintext now throws.
    //   acceptLegacyCiphertext: false, // pre-v2 values are no longer read
    // });
  });

  summary(3);
}

main();
