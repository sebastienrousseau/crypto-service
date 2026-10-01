/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { readFile } from "node:fs/promises";

/**
 * Process exit codes of the non-interactive CLI.
 *
 * - `OK` (0): the operation succeeded.
 * - `FAILURE` (1): the operation ran and failed (unreadable input, a
 *   cryptographic error, an invalid CBOM, a CBOM audit with status FAIL).
 * - `USAGE` (2): the command line was invalid (unknown command or
 *   option, missing or invalid argument, no arguments without a TTY).
 */
export const EXIT = { OK: 0, FAILURE: 1, USAGE: 2 } as const;

/** A stream (or, in tests, a list) of input chunks. */
export type InputSource =
  AsyncIterable<Buffer | string> | Iterable<Buffer | string>;

/** The streams a CLI run reads and writes, injectable for tests. */
export interface CliIO {
  /** Source of input when no file argument is given. */
  stdin: InputSource;
  /** Write to standard output (results only). */
  stdout: (text: string) => void;
  /** Write to standard error (diagnostics, usage, errors). */
  stderr: (text: string) => void;
  /** True when both stdin and stdout are terminals. */
  isTTY: boolean;
}

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

/** The {@link CliIO} of the current Node.js process. */
export const processIO = (): CliIO => ({
  stdin: process.stdin,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  isTTY: isInteractive(process.stdin, process.stdout),
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
 * Read the bytes of `file`, or of standard input when `file` is
 * omitted or `-`.
 *
 * @param file - Path of the input file, `-` or undefined for stdin.
 * @param io - The streams of the run.
 */
export const readInput = (file: string | undefined, io: CliIO) =>
  file === undefined || file === "-" ? readAll(io.stdin) : readFile(file);

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
