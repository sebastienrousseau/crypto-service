/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { readFile } from "node:fs/promises";
import prompts from "prompts";

/**
 * Process exit codes of the non-interactive CLI.
 *
 * - `OK` (0): the operation succeeded.
 * - `FAILURE` (1): the operation ran and failed (unreadable input, a
 *   cryptographic error such as a wrong key, a signature or password
 *   that does not verify, an invalid CBOM, a CBOM audit with status
 *   FAIL).
 * - `USAGE` (2): the command line was invalid (unknown command or
 *   option, missing or invalid argument, no arguments without a TTY,
 *   no source for a key or password, key and data both on stdin).
 */
export const EXIT = { OK: 0, FAILURE: 1, USAGE: 2 } as const;

/** A stream (or, in tests, a list) of input chunks. */
export type InputSource =
  AsyncIterable<Buffer | string> | Iterable<Buffer | string>;

/** The streams a CLI run reads and writes, injectable for tests. */
export interface CliIO {
  /** Source of input when no file argument is given. */
  stdin: InputSource;
  /** Write to standard output (results only; bytes are written as is). */
  stdout: (data: string | Uint8Array) => void;
  /** Write to standard error (diagnostics, usage, errors). */
  stderr: (text: string) => void;
  /** True when both stdin and stdout are terminals. */
  isTTY: boolean;
  /**
   * Ask for a secret without echoing it; undefined when stdin is not a
   * terminal, so no prompt can be answered.
   */
  promptSecret?: ((message: string) => Promise<string | undefined>) | undefined;
}

/**
 * A command line that is invalid in a way commander cannot see (two
 * inputs on stdin, no source for a secret): exits {@link EXIT.USAGE}.
 */
export class UsageError extends Error {}

/** Mutable state shared by the subcommands of one run. */
export interface RunContext {
  /** The streams the run reads and writes. */
  io: CliIO;
  /** Exit code an action sets when it finishes without throwing. */
  exitCode: number;
}

/**
 * Whether a run is interactive: both its input and output are
 * terminals.
 *
 * @param input - The input stream.
 * @param output - The output stream.
 */
export const isInteractive = (
  input: { isTTY?: boolean },
  output: { isTTY?: boolean },
) => Boolean(input.isTTY && output.isTTY);

/**
 * End quietly when the reader of `stream` goes away (`crypto-cli ... |
 * head`): an EPIPE exits with {@link EXIT.OK}, as Unix tools stop
 * writing to a closed pipe. Any other stream error is re-thrown.
 */
export const exitOnClosedPipe = (
  stream: NodeJS.EventEmitter,
  exit: (code: number) => void,
) =>
  stream.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "EPIPE") throw err;
    exit(EXIT.OK);
  });

/**
 * Ask for a secret on the terminal without echoing it. The prompt goes
 * to stderr, so stdout keeps only the result.
 *
 * @param message - The prompt.
 * @returns The answer, or undefined when the prompt was cancelled.
 */
export const promptHidden = async (message: string) => {
  const answer = await prompts({
    type: "password",
    name: "secret",
    message,
    stdout: process.stderr,
  });
  return answer.secret as string | undefined;
};

/**
 * The secret prompt of a run: {@link promptHidden} when `stdin` is a
 * terminal, else undefined (a pipe cannot answer a prompt).
 *
 * @param stdin - The input stream.
 */
export const secretPrompt = (stdin: { isTTY?: boolean }) =>
  stdin.isTTY ? promptHidden : undefined;

/** The {@link CliIO} of the current Node.js process. */
export const processIO = (): CliIO => ({
  stdin: process.stdin,
  stdout: (data) => process.stdout.write(data),
  stderr: (text) => process.stderr.write(text),
  isTTY: isInteractive(process.stdin, process.stdout),
  promptSecret: secretPrompt(process.stdin),
});

/** Read a stream to its end as one buffer. */
const readAll = async (stream: InputSource) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * Whether a file argument means standard input (omitted or `-`).
 *
 * @param file - The file argument.
 */
export const isStdin = (file: string | undefined): file is undefined | "-" =>
  file === undefined || file === "-";

/**
 * Read the bytes of `file`, or of standard input when `file` is
 * omitted or `-`.
 *
 * @param file - Path of the input file, `-` or undefined for stdin.
 * @param io - The streams of the run.
 */
export const readInput = (file: string | undefined, io: CliIO) =>
  isStdin(file) ? readAll(io.stdin) : readFile(file);

/**
 * The text of an input that is either a bare value or the JSON line a
 * `--json` run printed, from which `field` is taken.
 *
 * @param input - The input bytes.
 * @param field - The field of the JSON form holding the value.
 * @throws When the JSON form has no string `field`.
 */
export const valueOrJsonField = (input: Buffer, field: string): string => {
  const text = input.toString("utf8").trim();
  if (!text.startsWith("{")) return text;
  const value = (JSON.parse(text) as Record<string, unknown>)[field];
  if (typeof value !== "string") {
    throw new Error(`the JSON input has no "${field}" string`);
  }
  return value;
};

/**
 * Write a result to stdout: one line of JSON when `json` is set, else
 * the human-readable `text`.
 *
 * @param io - The streams of the run.
 * @param json - Whether `--json` was given.
 * @param data - The machine-readable result.
 * @param text - The human-readable rendering of `data`.
 */
export const emit = (io: CliIO, json: boolean, data: unknown, text: string) =>
  io.stdout(`${json ? JSON.stringify(data) : text}\n`);
