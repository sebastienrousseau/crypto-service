/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/** CBOM standard formats the CLI can emit. */
export const CBOM_FORMATS = ["cyclonedx", "spdx"] as const;

/** One of {@link CBOM_FORMATS}. */
export type CbomFormat = (typeof CBOM_FORMATS)[number];

/**
 * Scan `directory` (or the current directory when blank) and return its
 * CBOM document in `cbomFormat` (CycloneDX unless "spdx").
 *
 * @param directory - Directory or file to scan.
 * @param cbomFormat - CBOM standard to emit.
 */
export const buildCbom = async (
  directory: string | undefined,
  cbomFormat: CbomFormat | undefined,
): Promise<object> => {
  const { scanDirectory, generateCycloneDxCbom, generateSpdxCbom } =
    await import("@sebastienrousseau/crypto-cbom");
  const targetDir = directory && directory.trim() ? directory.trim() : ".";
  const assets = scanDirectory(targetDir);
  return cbomFormat === "spdx"
    ? generateSpdxCbom(assets)
    : generateCycloneDxCbom(assets);
};

/**
 * Parse, validate and audit a CBOM JSON document.
 *
 * @param raw - The CBOM document as JSON text.
 * @returns The audit result.
 * @throws When `raw` is not JSON or not a valid CBOM document.
 */
export const auditCbomJson = async (raw: string) => {
  const { validateCbom, auditCbom } =
    await import("@sebastienrousseau/crypto-cbom");
  const parsed = JSON.parse(raw);
  const validation = validateCbom(parsed);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }
  return auditCbom(parsed);
};
