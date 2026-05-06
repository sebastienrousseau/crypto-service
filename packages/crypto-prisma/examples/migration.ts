// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Migration example: encrypting existing plaintext data.
 *
 * Demonstrates a safe strategy for migrating an existing database
 * from plaintext to encrypted fields without downtime.
 */

// import { PrismaClient } from "@prisma/client";
// import { secretbox } from "@sebastienrousseau/crypto-lib";

/**
 * Example: Migrating existing plaintext data to encrypted storage.
 *
 * The encryption middleware gracefully handles plaintext data -- if
 * decryption fails, it returns the original value. This means you can
 * enable encryption and then migrate data in the background.
 *
 * ```ts
 * const prisma = new PrismaClient();
 * const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY!;
 *
 * // Step 1: Enable the middleware (reads will gracefully handle both
 * // plaintext and encrypted data).
 * prisma.$use(
 *   createEncryptionMiddleware({
 *     key: ENCRYPTION_KEY,
 *     encryptedFields: [
 *       { model: "User", fields: ["email", "phone"] },
 *     ],
 *   })
 * );
 *
 * // Step 2: Migrate existing rows in batches. Use raw queries to
 * // bypass the middleware and read actual stored values.
 * async function migrateUsers(batchSize = 100): Promise<number> {
 *   let migrated = 0;
 *   let cursor: number | undefined;
 *
 *   while (true) {
 *     // Read raw (unprocessed) data from the database
 *     const rows = await prisma.$queryRaw<
 *       Array<{ id: number; email: string; phone: string | null }>
 *     >`
 *       SELECT id, email, phone FROM "User"
 *       ${cursor ? Prisma.sql`WHERE id > ${cursor}` : Prisma.empty}
 *       ORDER BY id ASC
 *       LIMIT ${batchSize}
 *     `;
 *
 *     if (rows.length === 0) break;
 *
 *     for (const row of rows) {
 *       // Skip already-encrypted values (they are base64 blobs)
 *       const isAlreadyEncrypted = isBase64Blob(row.email);
 *       if (isAlreadyEncrypted) {
 *         cursor = row.id;
 *         continue;
 *       }
 *
 *       // Encrypt and update via raw query to bypass middleware
 *       const encEmail = secretbox.seal(ENCRYPTION_KEY, row.email).sealed;
 *       const encPhone = row.phone
 *         ? secretbox.seal(ENCRYPTION_KEY, row.phone).sealed
 *         : null;
 *
 *       await prisma.$executeRaw`
 *         UPDATE "User"
 *         SET email = ${encEmail}, phone = ${encPhone}
 *         WHERE id = ${row.id}
 *       `;
 *
 *       migrated++;
 *       cursor = row.id;
 *     }
 *
 *     console.log(`Migrated ${migrated} rows so far...`);
 *   }
 *
 *   return migrated;
 * }
 *
 * function isBase64Blob(value: string): boolean {
 *   // Encrypted values are base64-encoded and at least 40 chars
 *   // (24B nonce + 16B tag = 40B minimum before base64 encoding)
 *   if (value.length < 54) return false; // base64 of 40 bytes = 56 chars
 *   try {
 *     const buf = Buffer.from(value, "base64");
 *     // Re-encode and compare to detect valid base64
 *     return buf.toString("base64") === value;
 *   } catch {
 *     return false;
 *   }
 * }
 *
 * // Run the migration
 * const total = await migrateUsers();
 * console.log(`Migration complete: ${total} rows encrypted.`);
 *
 * await prisma.$disconnect();
 * ```
 */
export {};
