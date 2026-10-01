/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

/** Supported AEAD cipher algorithms for modern encryption. */
const ALGORITHMS = [
  "xchacha20-poly1305",
  "aes-256-gcm",
  "aes-128-gcm",
  "aes-256-gcm-siv",
  "aes-128-gcm-siv",
];

/** The questions handleModernEncrypt asks, in order. */
const QUESTIONS: prompts.PromptObject[] = [
  {
    type: "select",
    name: "algorithm",
    message: "Select encryption algorithm",
    choices: ALGORITHMS.map((a) => ({ title: a, value: a })),
  },
  {
    type: "password",
    name: "key",
    message: "Encryption key (hex, 32 bytes / 64 hex chars)",
  },
  {
    type: "text",
    name: "plaintext",
    message: "Plaintext to encrypt",
  },
  {
    type: "select",
    name: "outputFormat",
    message: "Output format",
    choices: [
      { title: "JSON", value: "json" },
      { title: "Hex ciphertext only", value: "hex" },
    ],
  },
];

/** Encrypt with the selected AEAD cipher. */
async function encryptWith(algorithm: string, key: string, plaintext: string) {
  const lib = await import("@sebastienrousseau/crypto-lib/modern");
  if (algorithm === "xchacha20-poly1305") {
    return lib.aeadEncrypt({ key, plaintext });
  }
  if (algorithm.includes("siv")) {
    return lib.aesGcmSivEncrypt({ key, plaintext });
  }
  return lib.aesGcmEncrypt({ key, plaintext });
}

/**
 * Interactively encrypt data using modern AEAD ciphers (XChaCha20-Poly1305, AES-GCM, AES-GCM-SIV).
 *
 * @example
 * ```ts
 * await handleModernEncrypt();
 * ```
 */
const handleModernEncrypt = async () => {
  const response = await prompts(QUESTIONS);

  if (!response.algorithm || !response.key || !response.plaintext) return;

  try {
    const result = await encryptWith(
      response.algorithm,
      response.key,
      response.plaintext,
    );
    if (response.outputFormat === "json") {
      writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
    } else {
      writeUtils.writeLn(format.green(result.ciphertext));
    }
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Encryption failed: ${(err as Error).message}`),
    );
  }
};

/** Default export of the handleModernEncrypt command handler. */
export default handleModernEncrypt;
