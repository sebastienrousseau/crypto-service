/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import fs from "node:fs";
import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

/** Options for programmatic CBOM execution. */
export interface ModernCbomOptions {
  action?: "scan" | "audit";
  directory?: string;
  format?: "cyclonedx" | "spdx";
  output?: string;
  filePath?: string;
}

/**
 * Interactively or programmatically generate or audit Cryptographic Bill of Materials (CBOM).
 *
 * @param options - Optional pre-configured parameters.
 * @example
 * ```ts
 * await handleModernCbom();
 * ```
 */
const handleModernCbom = async (options?: ModernCbomOptions) => {
  let action = options?.action;
  let directory = options?.directory;
  let cbomFormat = options?.format;
  let output = options?.output;
  let filePath = options?.filePath;

  if (!action) {
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

    if (!actionResponse.action) return;
    action = actionResponse.action;
  }

  if (action === "scan") {
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
      const { scanDirectory, generateCycloneDxCbom, generateSpdxCbom } =
        await import("@sebastienrousseau/crypto-cbom");

      const targetDir = directory && directory.trim() ? directory.trim() : ".";
      const assets = scanDirectory(targetDir);
      const cbom =
        cbomFormat === "spdx"
          ? generateSpdxCbom(assets)
          : generateCycloneDxCbom(assets);
      const json = JSON.stringify(cbom, null, 2);

      if (output && output.trim()) {
        fs.writeFileSync(output.trim(), json, "utf8");
        writeUtils.writeLn(format.green(`CBOM written to ${output.trim()}`));
      } else {
        writeUtils.writeLn(format.green(json));
      }
    } catch (err) {
      writeUtils.writeLn(
        format.red(`CBOM operation failed: ${(err as Error).message}`),
      );
    }
  } else if (action === "audit") {
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
      filePath = auditResponse.filePath;
      output = auditResponse.output;
    }

    try {
      const pathStr = filePath!.trim();
      if (!fs.existsSync(pathStr)) {
        writeUtils.writeLn(format.red(`File not found: ${pathStr}`));
        return;
      }

      const { validateCbom, auditCbom } =
        await import("@sebastienrousseau/crypto-cbom");

      const raw = fs.readFileSync(pathStr, "utf8");
      const parsed = JSON.parse(raw);
      const val = validateCbom(parsed);
      if (!val.valid) {
        writeUtils.writeLn(
          format.red(`Validation failed: ${val.errors.join(", ")}`),
        );
        return;
      }

      const result = auditCbom(parsed);
      const json = JSON.stringify(result, null, 2);

      if (output && output.trim()) {
        fs.writeFileSync(output.trim(), json, "utf8");
        writeUtils.writeLn(
          format.green(`Audit report written to ${output.trim()}`),
        );
      } else {
        writeUtils.writeLn(format.green(json));
      }
    } catch (err) {
      writeUtils.writeLn(
        format.red(`CBOM operation failed: ${(err as Error).message}`),
      );
    }
  }
};

/** Default export of the handleModernCbom command handler. */
export default handleModernCbom;
