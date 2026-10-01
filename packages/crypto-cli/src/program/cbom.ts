/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { writeFile } from "node:fs/promises";
import { Command, Option } from "commander";
import {
  auditCbomJson,
  buildCbom,
  CBOM_FORMATS,
  type CbomFormat,
} from "../commands/modern/cbom.core";
import { EXIT, emit, readInput, type RunContext } from "./io";

/** Options shared by `cbom scan` and `cbom audit`. */
interface OutputOptions {
  output?: string;
  json?: boolean;
}

/** Options of `cbom scan`. */
interface ScanOptions extends OutputOptions {
  format: CbomFormat;
}

/**
 * Write `document` to `opts.output` (pretty-printed, with a note on
 * stderr) or, without `--output`, to stdout.
 */
const deliver = async (
  ctx: RunContext,
  document: unknown,
  opts: OutputOptions,
  label: string,
) => {
  const pretty = JSON.stringify(document, null, 2);
  if (opts.output === undefined) {
    emit(ctx.io, Boolean(opts.json), document, pretty);
    return;
  }
  await writeFile(opts.output, `${pretty}\n`, "utf8");
  ctx.io.stderr(`${label} written to ${opts.output}\n`);
};

/** The `--output` and `--json` options of a CBOM subcommand. */
const withOutputOptions = (command: Command, what: string) =>
  command
    .option("-o, --output <file>", `write the ${what} to a file, not stdout`)
    .option("--json", `print the ${what} as one line of JSON`);

/** Register `cbom scan [directory]`. */
const registerScan = (cbom: Command, ctx: RunContext) =>
  withOutputOptions(
    cbom
      .command("scan")
      .description("Scan source code and print its CBOM")
      .argument("[directory]", "directory or file to scan", ".")
      .addOption(
        new Option("-f, --format <format>", "CBOM standard")
          .choices(CBOM_FORMATS)
          .default("cyclonedx"),
      ),
    "CBOM",
  ).action(async (directory: string, opts: ScanOptions) => {
    await deliver(ctx, await buildCbom(directory, opts.format), opts, "CBOM");
  });

/** Register `cbom audit [file]`: exit code 1 when the status is FAIL. */
const registerAudit = (cbom: Command, ctx: RunContext) =>
  withOutputOptions(
    cbom
      .command("audit")
      .description(
        "Validate and audit a CBOM; exits 1 when the audit status is FAIL",
      )
      .argument(
        "[file]",
        "CBOM JSON file; '-' or omitted reads standard input",
      ),
    "audit report",
  ).action(async (file: string | undefined, opts: OutputOptions) => {
    const raw = (await readInput(file, ctx.io)).toString("utf8");
    const result = await auditCbomJson(raw);
    await deliver(ctx, result, opts, "Audit report");
    if (result.status === "FAIL") ctx.exitCode = EXIT.FAILURE;
  });

/**
 * Register `cbom scan` and `cbom audit`.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerCbom = (program: Command, ctx: RunContext) => {
  const cbom = program
    .command("cbom")
    .description("Generate or audit a Cryptographic Bill of Materials")
    .helpCommand(false);
  registerScan(cbom, ctx);
  registerAudit(cbom, ctx);
  return cbom;
};
