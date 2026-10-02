/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import fs from "node:fs";
import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";
import { auditCbomJson, buildCbom, type CbomFormat } from "./cbom.core";

/** Options for programmatic CBOM execution. */
export interface ModernCbomOptions {
  action?: "scan" | "audit";
  directory?: string;
  format?: CbomFormat;
  output?: string;
  filePath?: string;
}

/** Write `json` to `output` when one is given, else print it. */
const emit = (json: string, output: string | undefined, label: string) => {
  if (output && output.trim()) {
    fs.writeFileSync(output.trim(), json, "utf8");
    writeUtils.writeLn(format.green(`${label} written to ${output.trim()}`));
  } else {
    writeUtils.writeLn(format.green(json));
  }
};

/** Report a failed scan or audit. */
const fail = (err: unknown) => {
  writeUtils.writeLn(
    format.red(`CBOM operation failed: ${(err as Error).message}`),
  );
};

/** Ask which operation to run; undefined when the prompt is cancelled. */
const promptAction = async (): Promise<ModernCbomOptions["action"]> => {
  const actionResponse = await prompts({
    type: "select",
    name: "action",
    message: "Select CBOM operation",
    choices: [
      { title: "Scan directory for cryptographic assets", value: "scan" },
      {
        title: "Audit CBOM report for post-quantum & DORA compliance",
        value: "audit",
      },
    ],
  });
  return actionResponse.action;
};

/** Scan a directory and emit its CBOM, prompting for unset options. */
const runScan = async (
  directory: string | undefined,
  cbomFormat: ModernCbomOptions["format"],
  output: string | undefined,
) => {
  if (directory === undefined && cbomFormat === undefined) {
    const scanResponse = await prompts([
      {
        type: "text",
        name: "directory",
        message: "Directory to scan (default: .)",
      },
      {
        type: "select",
        name: "format",
        message: "CBOM standard format",
        choices: [
          { title: "CycloneDX (1.6)", value: "cyclonedx" },
          { title: "SPDX (3.0)", value: "spdx" },
        ],
      },
      {
        type: "text",
        name: "output",
        message: "Output file path (leave empty for stdout)",
      },
    ]);

    if (scanResponse.directory === undefined) return;
    directory = scanResponse.directory;
    cbomFormat = scanResponse.format;
    output = scanResponse.output;
  }

  try {
    const cbom = await buildCbom(directory, cbomFormat);
    emit(JSON.stringify(cbom, null, 2), output, "CBOM");
  } catch (err) {
    fail(err);
  }
};

/** Validate and audit a CBOM file, prompting for unset options. */
const runAudit = async (
  filePath: string | undefined,
  output: string | undefined,
) => {
  if (!filePath) {
    const auditResponse = await prompts([
      {
        type: "text",
        name: "filePath",
        message: "Path to CBOM JSON file",
      },
      {
        type: "text",
        name: "output",
        message: "Output file path (leave empty for stdout)",
      },
    ]);

    if (!auditResponse.filePath) return;
    filePath = auditResponse.filePath as string;
    output = auditResponse.output;
  }

  try {
    const pathStr = filePath.trim();
    if (!fs.existsSync(pathStr)) {
      writeUtils.writeLn(format.red(`File not found: ${pathStr}`));
      return;
    }

    const result = await auditCbomJson(fs.readFileSync(pathStr, "utf8"));
    emit(JSON.stringify(result, null, 2), output, "Audit report");
  } catch (err) {
    fail(err);
  }
};

/**
 * Interactively or programmatically generate or audit Cryptographic Bill of Materials (CBOM).
 *
 * @param options - Optional pre-configured parameters.
 * @example
 * ```ts
 * await handleModernCbom();
 * ```
 */
const handleModernCbom = async (options: ModernCbomOptions = {}) => {
  const action = options.action ?? (await promptAction());
  if (action === "scan") {
    await runScan(options.directory, options.format, options.output);
  } else if (action === "audit") {
    await runAudit(options.filePath, options.output);
  }
};

/** Default export of the handleModernCbom command handler. */
export default handleModernCbom;
