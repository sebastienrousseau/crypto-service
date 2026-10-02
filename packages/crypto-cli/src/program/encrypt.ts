/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command } from "commander";
import { secretbox } from "@sebastienrousseau/crypto-lib/high-level";
import {
  emit,
  isStdin,
  readInput,
  valueOrJsonField,
  type RunContext,
} from "./io";
import {
  KEY_FLAGS,
  requireSecret,
  withSecretOptions,
  type SecretSource,
} from "./secrets";

/** Options of `encrypt` and `decrypt`. */
interface SecretboxOptions {
  keyFile?: string;
  keyStdin?: boolean;
  json?: boolean;
}

/** Length of a secretbox key in bytes. */
const KEY_LENGTH = 32;
/** A key written as hexadecimal text. */
const HEX_KEY = /^[0-9a-fA-F]{64}$/;
/** Standard base64 with padding, as `encrypt` prints it. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * The 32-byte key in a key file: 64 hexadecimal characters (surrounding
 * whitespace ignored) or 32 raw bytes.
 *
 * @param raw - The key file contents.
 * @throws When the contents are neither.
 */
export const parseSymmetricKey = (raw: Buffer): Uint8Array => {
  const text = raw.toString("latin1").trim();
  if (HEX_KEY.test(text)) return Buffer.from(text, "hex");
  if (raw.length === KEY_LENGTH) return raw;
  throw new Error(
    `the key must be ${KEY_LENGTH} bytes: 64 hexadecimal characters ` +
      `or ${KEY_LENGTH} raw bytes`,
  );
};

/** Read the key of a run from its `--key-file` or `--key-stdin`. */
const readKey = async (
  ctx: RunContext,
  opts: SecretboxOptions,
  file: string | undefined,
) => {
  const source: SecretSource = { file: opts.keyFile, stdin: opts.keyStdin };
  const raw = await requireSecret(
    {
      io: ctx.io,
      source,
      flags: KEY_FLAGS,
      dataOnStdin: isStdin(file),
      checkMode: true,
    },
    "key",
  );
  return parseSymmetricKey(raw);
};

/**
 * The sealed box in `decrypt` input: the base64 line `encrypt` prints,
 * or the JSON line of `encrypt --json`.
 *
 * @param input - The input bytes.
 */
const parseSealed = (input: Buffer) => {
  const sealed = valueOrJsonField(input, "sealed");
  if (!BASE64.test(sealed)) {
    throw new Error("the input is not base64 from crypto-cli encrypt");
  }
  return Buffer.from(sealed, "base64");
};

/** Add the `[file]`, key and `--json` arguments of a secretbox command. */
const secretboxCommand = (
  program: Command,
  name: string,
  description: string,
  input: string,
) =>
  withSecretOptions(
    program
      .command(name)
      .description(description)
      .argument("[file]", `${input}; '-' or omitted reads standard input`),
    KEY_FLAGS,
    {
      what: "key",
      format: "32 bytes, as 64 hex characters or raw",
      takesData: true,
    },
  ).option("--json", "print the result as one line of JSON");

/**
 * Register `encrypt [file]`: XChaCha20-Poly1305 with crypto-lib's
 * secretbox (random nonce), printed as base64 of nonce, ciphertext and
 * tag.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerEncrypt = (program: Command, ctx: RunContext) =>
  secretboxCommand(
    program,
    "encrypt",
    "Encrypt with XChaCha20-Poly1305 and print the sealed box as base64",
    "file to encrypt",
  ).action(async (file: string | undefined, opts: SecretboxOptions) => {
    const key = await readKey(ctx, opts, file);
    const result = secretbox.seal(key, await readInput(file, ctx.io));
    emit(ctx.io, Boolean(opts.json), result, result.sealed);
  });

/**
 * Register `decrypt [file]`: open a sealed box from `encrypt`; the
 * plaintext bytes go to stdout as they are (base64 with `--json`).
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerDecrypt = (program: Command, ctx: RunContext) =>
  secretboxCommand(
    program,
    "decrypt",
    "Decrypt the output of encrypt; exits 1 on a wrong key or modified input",
    "output of encrypt (base64 or its --json line)",
  ).action(async (file: string | undefined, opts: SecretboxOptions) => {
    const key = await readKey(ctx, opts, file);
    const sealed = parseSealed(await readInput(file, ctx.io));
    let plaintext: Uint8Array;
    try {
      plaintext = secretbox.open(key, sealed);
    } catch {
      throw new Error(
        "decryption failed: wrong key, or the input was modified or truncated",
      );
    }
    if (!opts.json) {
      ctx.io.stdout(plaintext);
      return;
    }
    emit(
      ctx.io,
      true,
      {
        plaintext: Buffer.from(plaintext).toString("base64"),
        encoding: "base64",
        algorithm: "xchacha20-poly1305",
      },
      "",
    );
  });
