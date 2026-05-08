// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Prisma Client Extension for transparent field-level encryption.
 *
 * Uses the modern `Prisma.defineExtension` API (Prisma 4.16+/5.x/6.x)
 * instead of the deprecated middleware approach. Provides the same
 * encrypt-on-write / decrypt-on-read semantics via query-level extensions.
 */

import { secretbox } from "@sebastienrousseau/crypto-lib";
import { computeHmac } from "@sebastienrousseau/crypto-lib";
import type { EncryptionConfig } from "./types";

// ── Helpers (shared logic) ───────────────────────────────────────────

function isDeterministic(
  field: string,
  deterministicFields?: string[],
): boolean {
  return deterministicFields?.includes(field) ?? false;
}

function encryptValue(
  value: unknown,
  key: string,
  field: string,
  deterministicFields?: string[],
): unknown {
  if (value === null || value === undefined) return value;
  const plaintext = typeof value === "string" ? value : JSON.stringify(value);

  if (isDeterministic(field, deterministicFields)) {
    const { mac } = computeHmac({
      algorithm: "sha256",
      key,
      data: plaintext,
    });
    return mac;
  }

  const { sealed } = secretbox.seal(key, plaintext);
  return sealed;
}

function decryptValue(
  value: unknown,
  key: string,
  field: string,
  deterministicFields?: string[],
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  if (isDeterministic(field, deterministicFields)) {
    return value;
  }

  try {
    const plainBytes = secretbox.open(key, value);
    return Buffer.from(plainBytes).toString("utf8");
  } catch {
    return value;
  }
}

function encryptRecord(
  data: Record<string, unknown> | undefined,
  fields: string[],
  key: string,
  deterministicFields?: string[],
): void {
  if (!data) return;
  for (const field of fields) {
    if (field in data) {
      data[field] = encryptValue(data[field], key, field, deterministicFields);
    }
  }
}

function decryptRecord(
  record: Record<string, unknown> | undefined | null,
  fields: string[],
  key: string,
  deterministicFields?: string[],
): void {
  if (!record) return;
  for (const field of fields) {
    if (field in record) {
      record[field] = decryptValue(
        record[field],
        key,
        field,
        deterministicFields,
      );
    }
  }
}

function encryptWhereClause(
  where: Record<string, unknown> | undefined,
  fields: string[],
  key: string,
  deterministicFields?: string[],
): void {
  if (!where || !deterministicFields) return;
  for (const field of fields) {
    if (
      isDeterministic(field, deterministicFields) &&
      field in where &&
      typeof where[field] === "string"
    ) {
      where[field] = encryptValue(
        where[field],
        key,
        field,
        deterministicFields,
      );
    }
  }
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
  const { key, encryptedFields, deterministicFields } = config;

  if (!key || key.length !== 64) {
    throw new Error(
      "Encryption key must be a 64-character hex string (256 bits).",
    );
  }

  // Build per-model query handlers
  const queryHandlers: Record<string, Record<string, unknown>> = {};

  for (const fieldConfig of encryptedFields) {
    const modelName = fieldConfig.model;
    const modelNameLower =
      modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const fields = fieldConfig.fields;

    queryHandlers[modelNameLower] = {
      async create({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptRecord(
          args["data"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (result && typeof result === "object") {
          decryptRecord(
            result as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
        return result;
      },

      async update({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptRecord(
          args["data"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        encryptWhereClause(
          args["where"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (result && typeof result === "object") {
          decryptRecord(
            result as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
        return result;
      },

      async upsert({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptRecord(
          args["create"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        encryptRecord(
          args["update"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        encryptWhereClause(
          args["where"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (result && typeof result === "object") {
          decryptRecord(
            result as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
        return result;
      },

      async findUnique({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptWhereClause(
          args["where"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (result && typeof result === "object") {
          decryptRecord(
            result as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
        return result;
      },

      async findFirst({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptWhereClause(
          args["where"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (result && typeof result === "object") {
          decryptRecord(
            result as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
        return result;
      },

      async findMany({
        args,
        query,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) {
        encryptWhereClause(
          args["where"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
        const result = await query(args);
        if (Array.isArray(result)) {
          for (const record of result) {
            decryptRecord(
              record as Record<string, unknown>,
              fields,
              key,
              deterministicFields,
            );
          }
        }
        return result;
      },
    };
  }

  return {
    name: "field-encryption",
    query: queryHandlers,
  };
}
