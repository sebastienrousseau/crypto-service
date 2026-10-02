/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Where the subcommands get keys and passwords from.
 *
 * A secret is never a command-line value, which other users can read in
 * the process list and which shells keep in their history. It comes
 * from a file (`--key-file`, `--password-file`), from standard input
 * (`--key-stdin`, `--password-stdin`) when the data comes from a file
 * argument, or, for a password, from a hidden prompt on a terminal.
 */

import { readFile, open } from "node:fs/promises";
import { Command, Option } from "commander";
import { readInput, UsageError, type CliIO } from "./io";

/** The two flags that name the source of one kind of secret. */
export interface SecretFlags {
  /** The flag taking a path, such as `--key-file`. */
  file: string;
  /** The flag reading standard input, such as `--key-stdin`. */
  stdin: string;
}

/** The parsed values of a pair of {@link SecretFlags}. */
export interface SecretSource {
  /** Path given to the file flag. */
  file?: string | undefined;
  /** Whether the stdin flag was given. */
  stdin?: boolean | undefined;
}

/** The flags of a key. */
export const KEY_FLAGS: SecretFlags = {
  file: "--key-file",
  stdin: "--key-stdin",
};

/** The flags of a password. */
export const PASSWORD_FLAGS: SecretFlags = {
  file: "--password-file",
  stdin: "--password-stdin",
};

/** Permission bits that let the group or other users at a file. */
const SHARED_MODE_BITS = 0o077;

/**
 * The warning for a secret file that users other than its owner can
 * access, or undefined when there is nothing to warn about. Windows has
 * no POSIX mode bits (Node reports 0o666 or 0o444 whatever the ACL
 * says), so nothing is reported there.
 *
 * @param file - The path, as given.
 * @param mode - `stat().mode` of the file.
 * @param platform - `process.platform`.
 */
export const sharedModeWarning = (
  file: string,
  mode: number,
  platform: NodeJS.Platform,
) => {
  if (platform === "win32" || (mode & SHARED_MODE_BITS) === 0) {
    return undefined;
  }
  const octal = (mode & 0o777).toString(8).padStart(3, "0");
  return (
    `crypto-cli: warning: ${file} can be read by other users ` +
    `(mode ${octal}); restrict it with: chmod 600 ${file}\n`
  );
};

/**
 * Read a secret file, writing {@link sharedModeWarning} to stderr when
 * other users can access it. The mode comes from the open file, not
 * from a second lookup of the path.
 *
 * @param file - Path of the file.
 * @param io - The streams of the run.
 * @param platform - `process.platform`.
 */
export const readSecretFile = async (
  file: string,
  io: CliIO,
  platform: NodeJS.Platform,
) => {
  const handle = await open(file, "r");
  try {
    const warning = sharedModeWarning(
      file,
      (await handle.stat()).mode,
      platform,
    );
    if (warning !== undefined) io.stderr(warning);
    return await handle.readFile();
  } finally {
    await handle.close();
  }
};

/** The help text of a pair of secret options. */
export interface SecretHelp {
  /** What the secret is ("key", "password"). */
  what: string;
  /** Its format, for the help text. */
  format: string;
  /** Whether the command also reads data from standard input. */
  takesData: boolean;
}

/**
 * Add the `<flags.file> <path>` and `<flags.stdin>` options, which
 * exclude each other.
 *
 * @param command - The command.
 * @param flags - The flag names.
 * @param help - What the help text says about the secret.
 */
export const withSecretOptions = (
  command: Command,
  flags: SecretFlags,
  help: SecretHelp,
) => {
  const note = help.takesData ? " (the data must then be a file argument)" : "";
  const stdinOption = new Option(
    flags.stdin,
    `read the ${help.what} from standard input${note}`,
  );
  return command
    .addOption(
      new Option(
        `${flags.file} <path>`,
        `read the ${help.what} from a file: ${help.format}`,
      ).conflicts(stdinOption.attributeName()),
    )
    .addOption(stdinOption);
};

/** How to read one secret for one run. */
export interface SecretRequest {
  /** The streams of the run. */
  io: CliIO;
  /** The parsed secret flags. */
  source: SecretSource;
  /** Their names, for error messages. */
  flags: SecretFlags;
  /** Whether the command reads its data from standard input. */
  dataOnStdin: boolean;
  /** Whether to warn when other users can read the secret file. */
  checkMode: boolean;
}

/**
 * Read a secret from the source its flags name.
 *
 * @returns The secret bytes, or undefined when no flag was given.
 * @throws {UsageError} When the secret and the data would both come
 *   from standard input.
 */
export const readSecret = async (
  req: SecretRequest,
): Promise<Buffer | undefined> => {
  const { io, source, flags } = req;
  if (source.stdin) {
    if (req.dataOnStdin) {
      throw new UsageError(
        `${flags.stdin} needs the data as a file argument: standard ` +
          `input cannot carry both`,
      );
    }
    return readInput(undefined, io);
  }
  if (source.file === undefined) return undefined;
  return req.checkMode
    ? readSecretFile(source.file, io, process.platform)
    : readFile(source.file);
};

/**
 * Read a secret that the command cannot run without.
 *
 * @throws {UsageError} When no flag names a source, or as
 *   {@link readSecret}.
 */
export const requireSecret = async (req: SecretRequest, what: string) => {
  const secret = await readSecret(req);
  if (secret === undefined) {
    throw new UsageError(
      `missing ${what}: pass ${req.flags.file} <path> or ${req.flags.stdin}`,
    );
  }
  return secret;
};
