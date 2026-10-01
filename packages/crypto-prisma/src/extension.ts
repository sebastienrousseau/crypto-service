// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Prisma Client Extension for transparent field-level encryption.
 *
 * Uses the modern `Prisma.defineExtension` API (Prisma 4.16+/5.x/6.x)
 * instead of the deprecated middleware approach. Provides the same
 * encrypt-on-write / decrypt-on-read semantics via query-level extensions.
 */

import { createFieldCodec, type FieldCodec } from "./codec";
import type { EncryptionConfig } from "./types";

/** Arguments Prisma passes to a query-extension handler. */
type QueryContext = {
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
};

/** Argument keys that carry record data to encrypt on write. */
const WRITE_ARG_KEYS = ["data", "create", "update"];

/** Model operations the extension intercepts. */
const OPERATIONS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
];

/**
 * Build the handler for one model: encrypt write data and blind-index
 * `where` values, run the query, then decrypt the returned record(s).
 */
function createModelHandler(
  codec: FieldCodec,
  model: string,
  fields: string[],
): (ctx: QueryContext) => Promise<unknown> {
  return async ({ args, query }) => {
    for (const argKey of WRITE_ARG_KEYS) {
      codec.encryptRecord(model, fields, args[argKey]);
    }
    codec.encryptWhere(model, fields, args["where"]);
    const result = await query(args);
    codec.decryptRecord(model, fields, result);
    return result;
  };
}

// ── Extension factory ────────────────────────────────────────────────

/**
 * Result type for the field encryption extension.
 *
 * This is typed broadly because the actual Prisma extension type
 * depends on the user's generated Prisma Client.
 *
 * @example
 * ```ts
 * const ext: FieldEncryptionExtension = {
 *   name: "field-encryption",
 *   query: { user: { create: async ({ args, query }) => query(args) } },
 * };
 * ```
 */
export interface FieldEncryptionExtension {
  /** Unique extension name used by Prisma for identification. */
  name: string;
  /** Per-model query handlers that intercept reads and writes. */
  query: Record<string, Record<string, unknown>>;
}

/**
 * Create a Prisma Client Extension that transparently encrypts/decrypts
 * configured model fields.
 *
 * Writes (`create`, `createMany`, `update`, `updateMany`, `upsert`) seal
 * each configured field in the `v2:` format, bound to its model and
 * field. Reads (`findUnique`, `findFirst`, `findMany` and the `OrThrow`
 * variants) decrypt them and reject with a `FieldDecryptionError` when a
 * stored value is not a valid ciphertext for that model and field.
 *
 * @throws If the key is not a 64-character hex string.
 *
 * @example
 * ```ts
 * import { PrismaClient } from "@prisma/client";
 * import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";
 *
 * const prisma = new PrismaClient().$extends(
 *   createFieldEncryptionExtension({
 *     key: process.env.FIELD_ENCRYPTION_KEY!,
 *     encryptedFields: [
 *       { model: "User", fields: ["email", "phone"] },
 *     ],
 *   })
 * );
 * ```
 */
export function createFieldEncryptionExtension(
  config: EncryptionConfig,
): FieldEncryptionExtension {
  const codec = createFieldCodec(config);
  const queryHandlers: Record<string, Record<string, unknown>> = {};

  for (const { model, fields } of config.encryptedFields) {
    const handle = createModelHandler(codec, model, fields);
    const handlers: Record<string, unknown> = {};
    for (const op of OPERATIONS) handlers[op] = handle;
    queryHandlers[model.charAt(0).toLowerCase() + model.slice(1)] = handlers;
  }

  return {
    name: "field-encryption",
    query: queryHandlers,
  };
}
