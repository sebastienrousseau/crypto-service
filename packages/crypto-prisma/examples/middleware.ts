// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Basic middleware setup and usage example.
 *
 * Demonstrates how to attach the encryption middleware to a Prisma client
 * and use it transparently with standard Prisma operations.
 */

// import { PrismaClient } from "@prisma/client";
// import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";

/**
 * Example: Transparent field-level encryption with Prisma middleware.
 *
 * ```ts
 * const prisma = new PrismaClient();
 *
 * // Attach the encryption middleware
 * prisma.$use(
 *   createEncryptionMiddleware({
 *     key: process.env.FIELD_ENCRYPTION_KEY!,
 *     encryptedFields: [
 *       { model: "User", fields: ["email", "phone", "address"] },
 *       { model: "Patient", fields: ["ssn", "diagnosis"] },
 *     ],
 *   })
 * );
 *
 * // --- Create ---
 * // Fields are encrypted before reaching the database.
 * const user = await prisma.user.create({
 *   data: {
 *     name: "Alice",
 *     email: "alice@example.com",
 *     phone: "+1-555-0100",
 *     address: "123 Main St, Springfield",
 *   },
 * });
 * console.log(user.email); // "alice@example.com" (decrypted on read)
 *
 * // --- Update ---
 * // Updated fields are re-encrypted automatically.
 * const updated = await prisma.user.update({
 *   where: { id: user.id },
 *   data: { phone: "+1-555-0200" },
 * });
 * console.log(updated.phone); // "+1-555-0200"
 *
 * // --- Read ---
 * // All configured fields are decrypted transparently.
 * const users = await prisma.user.findMany();
 * for (const u of users) {
 *   console.log(u.name, u.email); // plaintext
 * }
 *
 * // --- Upsert ---
 * const upserted = await prisma.user.upsert({
 *   where: { id: 999 },
 *   create: {
 *     name: "Bob",
 *     email: "bob@example.com",
 *     phone: "+1-555-0300",
 *     address: "456 Oak Ave",
 *   },
 *   update: { email: "bob-updated@example.com" },
 * });
 * console.log(upserted.email); // plaintext
 *
 * await prisma.$disconnect();
 * ```
 */
export {};
