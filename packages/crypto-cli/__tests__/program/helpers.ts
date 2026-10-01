/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { run, type CliIO } from "../../src/program/index";

/** Result of one in-process CLI run. */
export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** An in-memory IO: `input` is standard input, output is captured. */
export const memoryIO = (input: (Buffer | string)[] = [], isTTY = false) => {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIO = {
    stdin: input,
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    isTTY,
  };
  return { io, out, err };
};

/** Run the CLI in process on `args` with `input` as standard input. */
export const runCli = async (
  args: string[],
  input: (Buffer | string)[] = [],
): Promise<RunResult> => {
  const { io, out, err } = memoryIO(input);
  const code = await run(args, io);
  return { code, stdout: out.join(""), stderr: err.join("") };
};
