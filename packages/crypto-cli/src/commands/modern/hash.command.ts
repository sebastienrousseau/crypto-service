/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

/** Supported hash algorithms for modern hashing. */
const ALGORITHMS = [
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
  "blake2b",
  "blake3",
];

/**
 * Interactively hash data using modern algorithms (SHA-2, SHA-3, BLAKE2b, BLAKE3).
 *
 * @example
 * ```ts
 * await handleModernHash();
 * ```
 */
const handleModernHash = async () => {
  const response = await prompts([
    {
      type: "select",
      name: "algorithm",
      message: "Select hash algorithm",
      choices: ALGORITHMS.map((a) => ({ title: a, value: a })),
    },
    {
      type: "text",
      name: "data",
      message: "Data to hash",
    },
    {
      type: "select",
      name: "outputFormat",
      message: "Output format",
      choices: [
        { title: "JSON", value: "json" },
        { title: "Plain", value: "plain" },
      ],
    },
  ]);

  if (!response.algorithm || !response.data) return;

  try {
    const { hash } =
      await import("@sebastienrousseau/crypto-lib/dist/modern/hash");

    const result = hash({ algorithm: response.algorithm, data: response.data });

    if (response.outputFormat === "json") {
      writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
    } else {
      writeUtils.writeLn(format.green(result.digest));
    }
  } catch (err) {
    writeUtils.writeLn(format.red(`Hashing failed: ${(err as Error).message}`));
  }
};

/** Default export of the handleModernHash command handler. */
export default handleModernHash;
