/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fs from "node:fs";
import { Command } from "commander";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import {
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
  type MultiPqRecipient,
} from "@sebastienrousseau/crypto-lib/streaming";
import { emit, readInput, UsageError, type RunContext } from "./io";
import { parseCiphertext } from "./stream";

/** Parse and validate optional chunk size argument for multi-recipient streaming. */
export const parseMultiChunkSize = (value?: string): number | undefined => {
  if (value === undefined) return undefined;
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 1024 || size > 16777216) {
    throw new UsageError(
      "--chunk-size must be an integer between 1024 and 16777216",
    );
  }
  return size;
};

/** Options of `stream multi-encrypt`. */
interface StreamMultiEncryptOptions {
  recipients?: string;
  chunkSize?: string;
  json?: boolean;
}

/** Options of `stream multi-decrypt`. */
interface StreamMultiDecryptOptions {
  x25519Secret?: string;
  mlKemSecret?: string;
  recipientId?: string;
  chunkSize?: string;
  json?: boolean;
}

/** Validate individual recipient descriptor object. */
const validateRecipientItem = (item: unknown): MultiPqRecipient => {
  if (
    !item ||
    typeof item !== "object" ||
    typeof (item as Record<string, unknown>).recipientId !== "string" ||
    typeof (item as Record<string, unknown>).recipientX25519Public !==
      "string" ||
    typeof (item as Record<string, unknown>).recipientMlKemPublic !== "string"
  ) {
    throw new UsageError(
      "each recipient must have recipientId, recipientX25519Public, and recipientMlKemPublic strings",
    );
  }
  return item as MultiPqRecipient;
};

/** Parse and validate recipient descriptors from JSON string or file path. */
export const parseRecipients = (value?: string): MultiPqRecipient[] => {
  if (!value) {
    throw new UsageError(
      "missing recipients: --recipients is required (JSON array or file path)",
    );
  }
  let raw = value.trim();
  if (!raw.startsWith("[") && fs.existsSync(raw)) {
    raw = fs.readFileSync(raw, "utf8").trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UsageError("invalid JSON in --recipients");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new UsageError(
      "--recipients must be a non-empty array of recipient objects",
    );
  }
  return parsed.map(validateRecipientItem);
};

/** Register `stream multi-encrypt [file]`. */
const registerStreamMultiEncrypt = (stream: Command, ctx: RunContext): void => {
  stream
    .command("multi-encrypt")
    .description(
      "Encrypt for multiple recipients with post-quantum hybrid STREAM AEAD",
    )
    .argument("[file]", "file to encrypt; '-' or omitted reads standard input")
    .option(
      "-r, --recipients <json-or-path>",
      "JSON array string or file path containing recipient public key descriptors",
    )
    .option(
      "-c, --chunk-size <bytes>",
      "chunk size in bytes (minimum 1024, default 65536)",
    )
    .option("--json", "print the result as one line of JSON")
    .action(
      async (file: string | undefined, opts: StreamMultiEncryptOptions) => {
        const recipients = parseRecipients(opts.recipients);
        const chunkSize = parseMultiChunkSize(opts.chunkSize);
        const input = await readInput(file, ctx.io);
        const result = streamMultiPqEncrypt({
          recipients,
          plaintext: input,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
        const b64 = Buffer.from(result.ciphertext).toString("base64");
        emit(
          ctx.io,
          Boolean(opts.json),
          {
            ciphertext: b64,
            algorithm: result.algorithm,
            recipientCount: result.recipientCount,
          },
          b64,
        );
      },
    );
};

/** Execute multi-recipient stream decryption and format plaintext output. */
const executeStreamMultiDecrypt = (
  ctx: RunContext,
  opts: StreamMultiDecryptOptions,
  ciphertext: Buffer,
  chunkSize?: number,
): void => {
  let decResult: { plaintext: Uint8Array; recipientId: string };
  try {
    decResult = streamMultiPqDecrypt({
      recipientX25519Secret: opts.x25519Secret as string,
      recipientMlKemSecret: opts.mlKemSecret as string,
      ...(opts.recipientId !== undefined
        ? { recipientId: opts.recipientId }
        : {}),
      ciphertext,
      ...(chunkSize !== undefined ? { chunkSize } : {}),
    });
  } catch {
    throw new Error(
      "decryption failed: wrong key, or the input was modified or truncated",
    );
  }
  if (!opts.json) {
    ctx.io.stdout(decResult.plaintext);
    wipeMemory(decResult.plaintext);
    return;
  }
  const b64 = Buffer.from(decResult.plaintext).toString("base64");
  wipeMemory(decResult.plaintext);
  emit(
    ctx.io,
    true,
    {
      plaintext: b64,
      recipientId: decResult.recipientId,
      encoding: "base64",
      algorithm: "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
    },
    "",
  );
};

/** Register `stream multi-decrypt [file]`. */
const registerStreamMultiDecrypt = (stream: Command, ctx: RunContext): void => {
  stream
    .command("multi-decrypt")
    .description(
      "Decrypt multi-recipient post-quantum hybrid STREAM ciphertext; exits 1 on error",
    )
    .argument(
      "[file]",
      "output of stream multi-encrypt (base64 or its --json line)",
    )
    .option("-x, --x25519-secret <hex>", "recipient X25519 secret key (hex)")
    .option(
      "-m, --ml-kem-secret <hex>",
      "recipient ML-KEM-768 secret key (hex)",
    )
    .option(
      "-i, --recipient-id <id>",
      "optional recipient identifier for direct slot lookup",
    )
    .option("-c, --chunk-size <bytes>", "chunk size in bytes")
    .option("--json", "print the result as one line of JSON")
    .action(
      async (file: string | undefined, opts: StreamMultiDecryptOptions) => {
        if (!opts.x25519Secret || !opts.mlKemSecret) {
          throw new UsageError(
            "missing recipient secret key: both --x25519-secret and --ml-kem-secret are required",
          );
        }
        const chunkSize = parseMultiChunkSize(opts.chunkSize);
        const ciphertext = parseCiphertext(await readInput(file, ctx.io));
        executeStreamMultiDecrypt(ctx, opts, ciphertext, chunkSize);
      },
    );
};

/** Register multi-recipient streaming subcommands on the stream command. */
export const registerStreamMulti = (stream: Command, ctx: RunContext): void => {
  registerStreamMultiEncrypt(stream, ctx);
  registerStreamMultiDecrypt(stream, ctx);
};
