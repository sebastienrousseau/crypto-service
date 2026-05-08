/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

/**
 * Interactively hash or verify passwords using Argon2 (id/i/d variants).
 *
 * @example
 * ```ts
 * await handlePasswordHash();
 * ```
 */
const handlePasswordHash = async () => {
  const response = await prompts([
    {
      type: "select",
      name: "action",
      message: "Action",
      choices: [
        { title: "Hash password", value: "hash" },
        { title: "Verify password", value: "verify" },
      ],
    },
    {
      type: "password",
      name: "password",
      message: "Password",
    },
    {
      type: "select",
      name: "variant",
      message: "Argon2 variant",
      choices: [
        { title: "argon2id (recommended)", value: "argon2id" },
        { title: "argon2i (side-channel resistant)", value: "argon2i" },
        { title: "argon2d (GPU resistant)", value: "argon2d" },
      ],
    },
  ]);

  if (!response.action || !response.password) return;

  try {
    const { hashPassword, verifyPasswordPhc } =
      await import("@sebastienrousseau/crypto-lib/dist/modern/password");

    if (response.action === "hash") {
      const result = hashPassword({
        password: response.password,
        variant: response.variant,
      });
      writeUtils.writeLn(
        format.green(
          JSON.stringify(
            {
              phc: result.phc,
              hash: result.hash,
              salt: result.salt,
              params: result.params,
              algorithm: result.algorithm,
            },
            null,
            2,
          ),
        ),
      );
    } else {
      const phcResp = await prompts({
        type: "text",
        name: "phc",
        message: "PHC hash string ($argon2id$v=19$...)",
      });
      if (!phcResp.phc) return;
      const result = verifyPasswordPhc({
        password: response.password,
        phc: phcResp.phc,
      });
      writeUtils.writeLn(
        format.green(JSON.stringify({ valid: result.valid }, null, 2)),
      );
    }
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Password hashing failed: ${(err as Error).message}`),
    );
  }
};

export default handlePasswordHash;
