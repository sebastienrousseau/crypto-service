/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { run, type CliIO } from "../../src/program/index";

/** Result of one in-process CLI run. */
export interface RunResult {
  code: number;
  stdout: string;
  /** Standard output byte for byte. */
  stdoutBytes: Buffer;
  stderr: string;
}

/**
 * An in-memory IO: `input` is standard input, output is captured (as
 * text in `out`, byte for byte in `bytes`).
 */
export const memoryIO = (input: (Buffer | string)[] = [], isTTY = false) => {
  const out: string[] = [];
  const bytes: Buffer[] = [];
  const err: string[] = [];
  const io: CliIO = {
    stdin: input,
    stdout: (data) => {
      const chunk = Buffer.from(data);
      bytes.push(chunk);
      out.push(chunk.toString("utf8"));
    },
    stderr: (text) => err.push(text),
    isTTY,
  };
  return { io, out, bytes, err };
};

/**
 * Run the CLI in process on `args` with `input` as standard input;
 * `patch` overrides parts of the IO (a secret prompt, say).
 */
export const runCli = async (
  args: string[],
  input: (Buffer | string)[] = [],
  patch: Partial<CliIO> = {},
): Promise<RunResult> => {
  const { io, out, bytes, err } = memoryIO(input);
  const code = await run(args, { ...io, ...patch });
  return {
    code,
    stdout: out.join(""),
    stdoutBytes: Buffer.concat(bytes),
    stderr: err.join(""),
  };
};
