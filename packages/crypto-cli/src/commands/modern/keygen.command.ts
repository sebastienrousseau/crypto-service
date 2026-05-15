/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

/** Supported algorithms for modern key pair generation. */
const ALGORITHMS = [
  "ed25519",
  "x25519",
  "ed448",
  "x448",
  "p256",
  "p384",
  "ml-kem-512",
  "ml-kem-768",
  "ml-kem-1024",
  "ml-dsa-44",
  "ml-dsa-65",
  "ml-dsa-87",
];

/**
 * Interactively generate modern key pairs (Ed25519, X25519, ML-KEM, ML-DSA, etc.).
 *
 * @example
 * ```ts
 * await handleModernKeygen();
 * ```
 */
const handleModernKeygen = async () => {
  const response = await prompts([
    {
      type: "select",
      name: "algorithm",
      message: "Select algorithm",
      choices: ALGORITHMS.map((a) => ({ title: a, value: a })),
    },
    {
      type: "text",
      name: "kid",
      message: "Key ID (leave empty for auto-generated)",
    },
    {
      type: "select",
      name: "use",
      message: "Key usage",
      choices: [
        { title: "Signing (sig)", value: "sig" },
        { title: "Encryption (enc)", value: "enc" },
      ],
    },
    {
      type: "select",
      name: "outputFormat",
      message: "Output format",
      choices: [
        { title: "JSON", value: "json" },
        { title: "Hex", value: "hex" },
      ],
    },
  ]);

  if (!response.algorithm) return;

  try {
    const { generateKeyPair } =
      await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");

    const metadata: Record<string, string> = {};
    if (response.kid) metadata.kid = response.kid;
    if (response.use) metadata.use = response.use;

    const result = generateKeyPair(response.algorithm, metadata);

    if (response.outputFormat === "json") {
      writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
    } else {
      writeUtils.writeLn(format.green(`Algorithm: ${result.algorithm}`));
      writeUtils.writeLn(format.green(`Key ID:    ${result.kid}`));
      writeUtils.writeLn(format.green(`Public:    ${result.publicKey}`));
      writeUtils.writeLn(format.green(`Private:   ${result.privateKey}`));
    }
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Key generation failed: ${(err as Error).message}`),
    );
  }
};

export default handleModernKeygen;
