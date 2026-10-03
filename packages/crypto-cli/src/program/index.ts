/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, CommanderError } from "commander";
import { getVersion } from "../utils/version.utils";
import { registerCbom } from "./cbom";
import { registerHash } from "./hash";
import { registerDecrypt, registerEncrypt } from "./encrypt";
import { EXIT, UsageError, type CliIO, type RunContext } from "./io";
import { registerKeygen } from "./keygen";
import { registerPassword } from "./password";
import { registerSign, registerVerify } from "./sign";
import { registerStream } from "./stream";
import { registerOpaque } from "./opaque";

export {
  EXIT,
  exitOnClosedPipe,
  processIO,
  type CliIO,
  type RunContext,
} from "./io";

/**
 * Build the non-interactive command tree. Commander reports usage
 * errors by throwing (see {@link run}) instead of exiting the process.
 *
 * @param ctx - The run context the actions write to.
 * @param version - The version printed by `--version`.
 */
export const buildProgram = (ctx: RunContext, version: string): Command => {
  const program = new Command("crypto-cli")
    .description(
      "Cryptographic operations from the command line. Run without " +
        "arguments in a terminal for the interactive menu.",
    )
    .version(version, "-V, --version", "print the version")
    .helpOption("-h, --help", "print help")
    .helpCommand(false)
    .exitOverride()
    .configureOutput({ writeOut: ctx.io.stdout, writeErr: ctx.io.stderr })
    .showSuggestionAfterError();
  registerHash(program, ctx);
  registerKeygen(program, ctx);
  registerEncrypt(program, ctx);
  registerDecrypt(program, ctx);
  registerSign(program, ctx);
  registerVerify(program, ctx);
  registerPassword(program, ctx);
  registerCbom(program, ctx);
  registerStream(program, ctx);
  registerOpaque(program, ctx);
  return program;
};

/** Map an error thrown by a run to its exit code, reporting it. */
const exitCodeFor = (err: unknown, io: CliIO): number => {
  if (err instanceof CommanderError) {
    // Commander has already written help, the version or the error.
    return err.exitCode === 0 ? EXIT.OK : EXIT.USAGE;
  }
  io.stderr(`crypto-cli: ${(err as Error).message}\n`);
  return err instanceof UsageError ? EXIT.USAGE : EXIT.FAILURE;
};

/**
 * Run the non-interactive CLI on `args` (without the node and script
 * paths) and return the process exit code (see {@link EXIT}).
 *
 * @param args - Command-line arguments.
 * @param io - The streams to read and write.
 */
export const run = async (args: string[], io: CliIO): Promise<number> => {
  const ctx: RunContext = { io, exitCode: EXIT.OK };
  const program = buildProgram(ctx, await getVersion());
  try {
    await program.parseAsync(args, { from: "user" });
    return ctx.exitCode;
  } catch (err) {
    return exitCodeFor(err, io);
  }
};

/**
 * Entry point: the interactive `menu` when there are no arguments and
 * both stdin and stdout are terminals; usage on stderr with exit code 2
 * when there are no arguments otherwise; else the subcommands.
 *
 * @param args - Command-line arguments.
 * @param io - The streams to read and write.
 * @param menu - Starts the interactive menu.
 */
export const main = async (
  args: string[],
  io: CliIO,
  menu: () => Promise<void>,
): Promise<number> => {
  if (args.length > 0) return run(args, io);
  if (io.isTTY) {
    await menu();
    return EXIT.OK;
  }
  const ctx: RunContext = { io, exitCode: EXIT.OK };
  io.stderr(buildProgram(ctx, await getVersion()).helpInformation());
  return EXIT.USAGE;
};
