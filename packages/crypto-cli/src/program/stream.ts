/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command } from "commander";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";
import {
  streamPqEncrypt,
  streamPqDecrypt,
} from "@sebastienrousseau/crypto-lib/streaming";
import {
  emit,
  readInput,
  UsageError,
  valueOrJsonField,
  type RunContext,
} from "./io";

/** Options of `stream encrypt`. */
interface StreamEncryptOptions {
  x25519Public?: string;
  mlKemPublic?: string;
  chunkSize?: string;
  json?: boolean;
}

/** Options of `stream decrypt`. */
interface StreamDecryptOptions {
  x25519Secret?: string;
  mlKemSecret?: string;
  chunkSize?: string;
  json?: boolean;
}

/** Standard base64 with padding. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Parse and validate optional chunk size argument. */
const parseChunkSize = (value?: string): number | undefined => {
  if (value === undefined) return undefined;
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 64) {
    throw new UsageError("--chunk-size must be an integer >= 64");
  }
  return size;
};

/** Parse sealed ciphertext from raw base64 or JSON input. */
const parseCiphertext = (input: Buffer): Buffer => {
  const text = valueOrJsonField(input, "ciphertext");
  if (!BASE64.test(text)) {
    throw new Error("the input is not base64 from crypto-cli stream encrypt");
  }
  return Buffer.from(text, "base64");
};

/** Register `stream encrypt [file]`. */
const registerStreamEncrypt = (stream: Command, ctx: RunContext): void => {
  stream
    .command("encrypt")
    .description(
      "Encrypt with post-quantum hybrid STREAM AEAD (X25519 + ML-KEM-768)",
    )
    .argument("[file]", "file to encrypt; '-' or omitted reads standard input")
    .option("-x, --x25519-public <hex>", "recipient X25519 public key (hex)")
    .option(
      "-m, --ml-kem-public <hex>",
      "recipient ML-KEM-768 public key (hex)",
    )
    .option(
      "-c, --chunk-size <bytes>",
      "chunk size in bytes (minimum 64, default 65536)",
    )
    .option("--json", "print the result as one line of JSON")
    .action(async (file: string | undefined, opts: StreamEncryptOptions) => {
      if (!opts.x25519Public || !opts.mlKemPublic) {
        throw new UsageError(
          "missing recipient public key: both --x25519-public and --ml-kem-public are required",
        );
      }
      const chunkSize = parseChunkSize(opts.chunkSize);
      const input = await readInput(file, ctx.io);
      const result = streamPqEncrypt({
        recipientX25519Public: opts.x25519Public,
        recipientMlKemPublic: opts.mlKemPublic,
        plaintext: input,
        ...(chunkSize !== undefined ? { chunkSize } : {}),
      });
      const b64 = Buffer.from(result.ciphertext).toString("base64");
      emit(
        ctx.io,
        Boolean(opts.json),
        { ciphertext: b64, algorithm: result.algorithm },
        b64,
      );
    });
};

/** Register `stream decrypt [file]`. */
const registerStreamDecrypt = (stream: Command, ctx: RunContext): void => {
  stream
    .command("decrypt")
    .description(
      "Decrypt post-quantum hybrid STREAM ciphertext; exits 1 on error",
    )
    .argument("[file]", "output of stream encrypt (base64 or its --json line)")
    .option("-x, --x25519-secret <hex>", "recipient X25519 secret key (hex)")
    .option(
      "-m, --ml-kem-secret <hex>",
      "recipient ML-KEM-768 secret key (hex)",
    )
    .option("-c, --chunk-size <bytes>", "chunk size in bytes")
    .option("--json", "print the result as one line of JSON")
    .action(async (file: string | undefined, opts: StreamDecryptOptions) => {
      if (!opts.x25519Secret || !opts.mlKemSecret) {
        throw new UsageError(
          "missing recipient secret key: both --x25519-secret and --ml-kem-secret are required",
        );
      }
      const chunkSize = parseChunkSize(opts.chunkSize);
      const ciphertext = parseCiphertext(await readInput(file, ctx.io));
      let plaintext: Uint8Array;
      try {
        plaintext = streamPqDecrypt({
          recipientX25519Secret: opts.x25519Secret,
          recipientMlKemSecret: opts.mlKemSecret,
          ciphertext,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
      } catch {
        throw new Error(
          "decryption failed: wrong key, or the input was modified or truncated",
        );
      }
      if (!opts.json) {
        ctx.io.stdout(plaintext);
        wipeMemory(plaintext);
        return;
      }
      const b64 = Buffer.from(plaintext).toString("base64");
      wipeMemory(plaintext);
      emit(
        ctx.io,
        true,
        {
          plaintext: b64,
          encoding: "base64",
          algorithm: "x25519-ml-kem-768-xchacha20-poly1305",
        },
        "",
      );
    });
};

/** Register `crypto-cli stream` and its subcommands. */
export const registerStream = (program: Command, ctx: RunContext): void => {
  const stream = program
    .command("stream")
    .description("Post-quantum hybrid streaming AEAD operations");
  registerStreamEncrypt(stream, ctx);
  registerStreamDecrypt(stream, ctx);
};
