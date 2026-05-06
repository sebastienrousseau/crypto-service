// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Client extension approach example.
 *
 * Demonstrates using the modern Prisma Client Extension API (Prisma 4.16+)
 * instead of the deprecated middleware approach.
 */

// import { PrismaClient } from "@prisma/client";
// import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

/**
 * Example: Field-level encryption via Prisma Client Extension.
 *
 * The extension approach is preferred for Prisma 5.x and 6.x because:
 * - It is type-safe and composable with other extensions.
 * - It does not rely on the deprecated `$use()` middleware API.
 * - Each extension wraps a specific set of query operations.
 *
 * ```ts
 * const basePrisma = new PrismaClient();
 *
 * // Extend the client with field encryption
 * const prisma = basePrisma.$extends(
 *   createFieldEncryptionExtension({
 *     key: process.env.FIELD_ENCRYPTION_KEY!,
 *     encryptedFields: [
 *       { model: "User", fields: ["email", "phone"] },
 *       { model: "CreditCard", fields: ["number", "cvv"] },
 *     ],
 *   })
 * );
 *
 * // All operations are transparently encrypted/decrypted
 * const card = await prisma.creditCard.create({
 *   data: {
 *     userId: 1,
 *     number: "4111-1111-1111-1111",
 *     cvv: "123",
 *     expiry: "12/28",
 *   },
 * });
 *
 * console.log(card.number); // "4111-1111-1111-1111" (decrypted)
 * // In the database: base64 XChaCha20-Poly1305 ciphertext
 *
 * // Compose with other extensions
 * const prismaWithLogging = basePrisma
 *   .$extends(createFieldEncryptionExtension({ ... }))
 *   .$extends(loggingExtension());
 *
 * await basePrisma.$disconnect();
 * ```
 */
export {};
