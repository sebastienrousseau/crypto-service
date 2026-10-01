// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Prisma middleware for transparent field-level encryption/decryption.
 *
 * Intercepts create/update/upsert/createMany/updateMany to encrypt
 * configured fields before they reach the database, and decrypts the
 * records returned by find* queries and by create/update/upsert.
 *
 * Uses secretbox (XChaCha20-Poly1305) from crypto-lib in the `v2:` format
 * described in `codec.ts`. Deterministic fields use an HMAC-SHA-256 blind
 * index (same plaintext + key = same MAC) and are returned as the MAC.
 * A stored value that cannot be decrypted raises `FieldDecryptionError`.
 */

import { createFieldCodec, type FieldCodec } from "./codec";
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

/** Prisma actions whose arguments carry record data to encrypt. */
const WRITE_ACTIONS = [
  "create",
  "update",
  "upsert",
  "createMany",
  "updateMany",
];
/** Argument keys that carry record data to encrypt on write. */
const WRITE_ARG_KEYS = ["data", "create", "update"];
/** Prisma actions whose result records are decrypted. */
const RESULT_ACTIONS = [
  "create",
  "update",
  "upsert",
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
];

/** Return the field configuration for a Prisma model (case-insensitive). */
function findModelConfig(
  model: string,
  encryptedFields: FieldConfig[],
): FieldConfig | undefined {
  return encryptedFields.find(
    (c) => c.model.toLowerCase() === model.toLowerCase(),
  );
}

/** Encrypt write data and blind-index `where` values in place. */
function encryptArgs(
  codec: FieldCodec,
  action: string,
  args: Record<string, unknown> | undefined,
  { model, fields }: FieldConfig,
): void {
  if (!args) return;
  if (WRITE_ACTIONS.includes(action)) {
    for (const argKey of WRITE_ARG_KEYS) {
      codec.encryptRecord(model, fields, args[argKey]);
    }
  }
  codec.encryptWhere(model, fields, args["where"]);
}

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
  const codec = createFieldCodec(config);

  return async (
    params: MiddlewareParams,
    next: MiddlewareNext,
  ): Promise<unknown> => {
    const modelConfig = params.model
      ? findModelConfig(params.model, config.encryptedFields)
      : undefined;
    if (!modelConfig || modelConfig.fields.length === 0) return next(params);

    encryptArgs(codec, params.action, params.args, modelConfig);
    const result = await next(params);
    if (RESULT_ACTIONS.includes(params.action)) {
      codec.decryptRecord(modelConfig.model, modelConfig.fields, result);
    }
    return result;
  };
}
