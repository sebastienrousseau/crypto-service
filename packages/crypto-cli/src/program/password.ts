/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command } from "commander";
import {
  hashPassword,
  verifyPasswordPhc,
} from "@sebastienrousseau/crypto-lib/modern";
import {
  EXIT,
  emit,
  isStdin,
  readInput,
  UsageError,
  valueOrJsonField,
  type RunContext,
} from "./io";
import {
  PASSWORD_FLAGS,
  readSecret,
  withSecretOptions,
  type SecretSource,
} from "./secrets";

/** Options of `password hash` and `password verify`. */
interface PasswordOptions {
  passwordFile?: string;
  passwordStdin?: boolean;
  json?: boolean;
}

/**
 * Ask for the password on the terminal, twice when `confirm` is set.
 *
 * @throws {UsageError} When there is no terminal to ask on, or standard
 *   input carries the data.
 */
const promptPassword = async (
  ctx: RunContext,
  dataOnStdin: boolean,
  confirm: boolean,
) => {
  const ask = ctx.io.promptSecret;
  if (ask === undefined || dataOnStdin) {
    throw new UsageError(
      "missing password: pass --password-file <path> or " +
        "--password-stdin (a prompt needs a terminal on stdin)",
    );
  }
  const password = (await ask("Password")) ?? "";
  if (confirm && (await ask("Repeat the password")) !== password) {
    throw new Error("the passwords do not match");
  }
  return password;
};

/**
 * The password of a run: from `--password-file` or `--password-stdin`
 * (one trailing line break removed), else from a hidden prompt.
 *
 * @throws When the password is empty.
 */
const readPassword = async (
  ctx: RunContext,
  opts: PasswordOptions,
  dataOnStdin: boolean,
  confirm: boolean,
) => {
  const source: SecretSource = {
    file: opts.passwordFile,
    stdin: opts.passwordStdin,
  };
  const raw = await readSecret({
    io: ctx.io,
    source,
    flags: PASSWORD_FLAGS,
    dataOnStdin,
    checkMode: true,
  });
  const password =
    raw === undefined
      ? await promptPassword(ctx, dataOnStdin, confirm)
      : raw.toString("utf8").replace(/\r?\n$/, "");
  if (password === "") throw new Error("the password is empty");
  return password;
};

/** Add the password and `--json` options to a `password` subcommand. */
const passwordCommand = (command: Command, takesData: boolean) =>
  withSecretOptions(command, PASSWORD_FLAGS, {
    what: "password",
    format: "one trailing line break is ignored",
    takesData,
  }).option("--json", "print the result as one line of JSON");

/** Register `password hash`: print the PHC string of a new hash. */
const registerHash = (password: Command, ctx: RunContext) =>
  passwordCommand(
    password
      .command("hash")
      .description(
        "Hash a password with Argon2id (crypto-lib defaults: t=3, " +
          "m=64 MiB, p=4) and print its PHC string",
      ),
    false,
  ).action(async (opts: PasswordOptions) => {
    const secret = await readPassword(ctx, opts, false, true);
    const { phc, algorithm, params } = hashPassword({ password: secret });
    emit(ctx.io, Boolean(opts.json), { phc, algorithm, params }, phc);
  });

/** Register `password verify [file]`: exit code 1 on a mismatch. */
const registerVerify = (password: Command, ctx: RunContext) =>
  passwordCommand(
    password
      .command("verify")
      .description(
        "Check a password against a PHC string; exits 1 when it does not match",
      )
      .argument(
        "[file]",
        "PHC string (password hash output or its --json line); '-' or " +
          "omitted reads standard input",
      ),
    true,
  ).action(async (file: string | undefined, opts: PasswordOptions) => {
    const secret = await readPassword(ctx, opts, isStdin(file), false);
    const phc = valueOrJsonField(await readInput(file, ctx.io), "phc");
    const { valid } = verifyPasswordPhc({ password: secret, phc });
    emit(ctx.io, Boolean(opts.json), { valid }, valid ? "valid" : "invalid");
    if (!valid) ctx.exitCode = EXIT.FAILURE;
  });

/**
 * Register `password hash` and `password verify`.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerPassword = (program: Command, ctx: RunContext) => {
  const password = program
    .command("password")
    .description("Hash or verify a password (Argon2id)")
    .helpCommand(false);
  registerHash(password, ctx);
  registerVerify(password, ctx);
  return password;
};
