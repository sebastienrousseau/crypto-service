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

/**
 * Interactively encrypt data using modern AEAD ciphers (XChaCha20-Poly1305, AES-GCM, AES-GCM-SIV).
 *
 * @example
 * ```ts
 * await handleModernEncrypt();
 * ```
 */
const handleModernEncrypt = async () => {
  const response = await prompts([
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
  ]);

  if (!response.algorithm || !response.key || !response.plaintext) return;

  try {
    if (response.algorithm === "xchacha20-poly1305") {
      const { aeadEncrypt } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/aead");
      const result = aeadEncrypt({
        key: response.key,
        plaintext: response.plaintext,
      });
      if (response.outputFormat === "json") {
        writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
      } else {
        writeUtils.writeLn(format.green(result.ciphertext));
      }
    } else if (response.algorithm.includes("siv")) {
      const { aesGcmSivEncrypt } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/aes");
      const result = aesGcmSivEncrypt({
        key: response.key,
        plaintext: response.plaintext,
      });
      if (response.outputFormat === "json") {
        writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
      } else {
        writeUtils.writeLn(format.green(result.ciphertext));
      }
    } else {
      const { aesGcmEncrypt } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/aes");
      const result = aesGcmEncrypt({
        key: response.key,
        plaintext: response.plaintext,
      });
      if (response.outputFormat === "json") {
        writeUtils.writeLn(format.green(JSON.stringify(result, null, 2)));
      } else {
        writeUtils.writeLn(format.green(result.ciphertext));
      }
    }
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Encryption failed: ${(err as Error).message}`),
    );
  }
};

/** Default export of the handleModernEncrypt command handler. */
export default handleModernEncrypt;
