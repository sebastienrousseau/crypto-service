// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Prisma middleware for transparent field-level encryption/decryption.
 *
 * Intercepts create/update/upsert to encrypt configured fields before they
 * reach the database, and intercepts find* queries to decrypt them on read.
 *
 * Uses secretbox (XChaCha20-Poly1305) from crypto-lib by default, with
 * optional AES-256-GCM support. Deterministic fields use HMAC-SHA-256 to
 * produce searchable ciphertexts (same plaintext + key = same hash).
 */

import { secretbox } from "@sebastienrousseau/crypto-lib";
import { computeHmac } from "@sebastienrousseau/crypto-lib";
import type { EncryptionConfig, FieldConfig } from "./types";

/**
 * Prisma middleware callback parameter shape.
 *
 * @example
 * ```ts
 * const params: MiddlewareParams = {
 *   action: "findMany",
 *   model: "User",
 *   args: { where: { id: 1 } },
 *   dataPath: [],
 *   runInTransaction: false,
 * };
 * ```
 */
export type MiddlewareParams = {
  /** The Prisma model name (e.g. "User"). */
  model?: string;
  /** The Prisma action (e.g. "findMany", "create"). */
  action: string;
  /** The arguments passed to the Prisma operation. */
  args: Record<string, unknown>;
  /** Path to nested data in the args. */
  dataPath: string[];
  /** Whether the operation runs inside a transaction. */
  runInTransaction: boolean;
};

/**
 * Callback to invoke the next middleware or the Prisma engine.
 *
 * @example
 * ```ts
 * const next: MiddlewareNext = async (params) => {
 *   return { id: 1, email: "user@example.com" };
 * };
 * ```
 */
export type MiddlewareNext = (params: MiddlewareParams) => Promise<unknown>;

/**
 * Prisma middleware function type.
 *
 * @example
 * ```ts
 * const middleware: PrismaMiddleware = async (params, next) => {
 *   console.log(`Action: ${params.action} on ${params.model}`);
 *   return next(params);
 * };
 * ```
 */
export type PrismaMiddleware = (
  params: MiddlewareParams,
  next: MiddlewareNext,
) => Promise<unknown>;

// ── Helpers ──────────────────────────────────────────────────────────

/** Return the list of encrypted field names for a given Prisma model. */
function getFieldsForModel(
  model: string,
  encryptedFields: FieldConfig[],
): string[] {
  const config = encryptedFields.find(
    (c) => c.model.toLowerCase() === model.toLowerCase(),
  );
  return config?.fields ?? [];
}

/** Check whether a field is configured for deterministic (HMAC) encryption. */
function isDeterministic(
  field: string,
  deterministicFields?: string[],
): boolean {
  return deterministicFields?.includes(field) ?? false;
}

/**
 * Encrypt a single field value.
 *
 * - Deterministic fields produce a hex HMAC-SHA-256 digest (searchable).
 * - Non-deterministic fields produce a base64 secretbox sealed blob.
 */
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

/**
 * Decrypt a single field value.
 *
 * Deterministic (HMAC) fields are one-way and cannot be decrypted — they
 * are returned as-is so the caller can compare hashes.
 */
function decryptValue(
  value: unknown,
  key: string,
  field: string,
  deterministicFields?: string[],
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  // Deterministic fields cannot be reversed
  if (isDeterministic(field, deterministicFields)) {
    return value;
  }

  try {
    const plainBytes = secretbox.open(key, value);
    return Buffer.from(plainBytes).toString("utf8");
  } catch {
    // If decryption fails (e.g. plaintext data during migration), return as-is
    return value;
  }
}

// ── Encrypt / decrypt record helpers ─────────────────────────────────

/** Encrypt all configured fields in a data record in-place. */
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

/** Decrypt all configured fields in a result record in-place. */
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

// ── Actions ──────────────────────────────────────────────────────────

/** Prisma actions that write data and require field encryption. */
const WRITE_ACTIONS = [
  "create",
  "update",
  "upsert",
  "createMany",
  "updateMany",
];
/** Prisma actions that read data and require field decryption. */
const READ_ACTIONS = ["findUnique", "findFirst", "findMany"];

// ── Factory ──────────────────────────────────────────────────────────

/**
 * Create a Prisma middleware that transparently encrypts/decrypts
 * configured model fields.
 *
 * @example
 * ```ts
 * import { PrismaClient } from "@prisma/client";
 * import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";
 *
 * const prisma = new PrismaClient();
 * prisma.$use(createEncryptionMiddleware({
 *   key: process.env.FIELD_ENCRYPTION_KEY!,
 *   encryptedFields: [
 *     { model: "User", fields: ["email", "phone"] },
 *   ],
 * }));
 * ```
 */
export function createEncryptionMiddleware(
  config: EncryptionConfig,
): PrismaMiddleware {
  const { key, encryptedFields, deterministicFields } = config;

  if (!key || key.length !== 64) {
    throw new Error(
      "Encryption key must be a 64-character hex string (256 bits).",
    );
  }

  return async (
    params: MiddlewareParams,
    next: MiddlewareNext,
  ): Promise<unknown> => {
    const model = params.model;
    if (!model) return next(params);

    const fields = getFieldsForModel(model, encryptedFields);
    if (fields.length === 0) return next(params);

    // ── Encrypt on write ──
    if (WRITE_ACTIONS.includes(params.action)) {
      const args = params.args as Record<string, unknown>;

      if (params.action === "upsert") {
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
      } else if (params.action === "createMany") {
        const data = args["data"];
        if (Array.isArray(data)) {
          for (const record of data) {
            encryptRecord(
              record as Record<string, unknown>,
              fields,
              key,
              deterministicFields,
            );
          }
        }
      } else {
        encryptRecord(
          args["data"] as Record<string, unknown> | undefined,
          fields,
          key,
          deterministicFields,
        );
      }
    }

    // ── Encrypt "where" clauses for deterministic fields ──
    if (params.args && typeof params.args === "object") {
      const where = (params.args as Record<string, unknown>)["where"] as
        | Record<string, unknown>
        | undefined;
      if (where && deterministicFields) {
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
    }

    const result = await next(params);

    // ── Decrypt on read ──
    if (READ_ACTIONS.includes(params.action) && result) {
      if (Array.isArray(result)) {
        for (const record of result) {
          decryptRecord(
            record as Record<string, unknown>,
            fields,
            key,
            deterministicFields,
          );
        }
      } else if (typeof result === "object") {
        decryptRecord(
          result as Record<string, unknown>,
          fields,
          key,
          deterministicFields,
        );
      }
    }

    return result;
  };
}
