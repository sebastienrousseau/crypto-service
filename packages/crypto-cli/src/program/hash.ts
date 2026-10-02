/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, Option } from "commander";
import {
  hash,
  HASH_ALGORITHMS,
  type HashAlgorithm,
} from "@sebastienrousseau/crypto-lib/modern";
import { emit, readInput, type RunContext } from "./io";

/** Options of `crypto-cli hash`. */
interface HashOptions {
  algorithm: HashAlgorithm;
  json?: boolean;
}

/**
 * Register `hash [file]`: digest a file or standard input.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerHash = (program: Command, ctx: RunContext) =>
  program
    .command("hash")
    .description("Hash a file, or standard input when no file is given")
    .argument("[file]", "file to hash; '-' or omitted reads standard input")
    .addOption(
      new Option("-a, --algorithm <name>", "hash algorithm")
        .choices(HASH_ALGORITHMS)
        .default("sha256"),
    )
    .option("--json", "print the result as one line of JSON")
    .action(async (file: string | undefined, opts: HashOptions) => {
      const data = await readInput(file, ctx.io);
      const result = hash({ algorithm: opts.algorithm, data });
      emit(ctx.io, Boolean(opts.json), result, result.digest);
    });
