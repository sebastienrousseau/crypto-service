// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Deterministic encryption for search example.
 *
 * Demonstrates how to configure searchable encrypted fields using
 * HMAC-SHA-256 deterministic encryption. This allows exact-match
 * queries on encrypted fields at the cost of revealing value equality.
 */

// import { PrismaClient } from "@prisma/client";
// import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";

/**
 * Example: Searchable encryption with deterministic fields.
 *
 * By default, encryption is non-deterministic (each write produces a
 * different ciphertext), which prevents searching. For fields that need
 * exact-match lookup, use `deterministicFields` to generate HMAC-based
 * hashes instead.
 *
 * ```ts
 * const prisma = new PrismaClient();
 *
 * prisma.$use(
 *   createEncryptionMiddleware({
 *     key: process.env.FIELD_ENCRYPTION_KEY!,
 *     encryptedFields: [
 *       { model: "User", fields: ["email", "phone", "ssn"] },
 *     ],
 *     // Only email is searchable; phone and ssn use random encryption
 *     deterministicFields: ["email"],
 *   })
 * );
 *
 * // Create a user
 * await prisma.user.create({
 *   data: {
 *     name: "Alice",
 *     email: "alice@example.com",
 *     phone: "+1-555-0100",
 *     ssn: "123-45-6789",
 *   },
 * });
 *
 * // Search by email works because it uses deterministic HMAC
 * const found = await prisma.user.findFirst({
 *   where: { email: "alice@example.com" },
 * });
 * console.log(found?.name); // "Alice"
 *
 * // NOTE: The email column in the database stores a hex HMAC digest,
 * // NOT the original email. Deterministic fields are one-way -- you
 * // cannot decrypt them back to the original value.
 * //
 * // If you need both searchability AND decryption, store the email
 * // in two columns:
 * //   - email_hash (deterministic, for WHERE clauses)
 * //   - email_encrypted (non-deterministic, for reading)
 * //
 * // Example schema:
 * // model User {
 * //   id              Int    @id @default(autoincrement())
 * //   email_hash      String @unique  // deterministic (HMAC)
 * //   email_encrypted String          // non-deterministic (secretbox)
 * //   name            String
 * // }
 *
 * await prisma.$disconnect();
 * ```
 */
export {};
