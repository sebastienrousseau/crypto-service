/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { verify } from "@sebastienrousseau/crypto-lib/pgp";
import prompts from "prompts";

/**
 * Interactively verify a PGP-signed message via CLI prompts.
 *
 * @example
 * ```ts
 * await handleVerify();
 * ```
 */
const handleVerify = async () => {
  const responseVerify = await prompts([
    {
      type: "text",
      name: "message",
      message: "Provide a message to be verified.",
    },
    {
      type: "text",
      name: "verificationKeys",
      message:
        "Provide an array of publicKeys or single key, to verify signatures in base64 format",
    },
    {
      type: "text",
      name: "date",
      message:
        "Provide an ISO Date string formatted date to verify message. If not provided, current date will be used. (YYYY-MM-DDTHH:mm:ss.sssZ)",
    },
  ]);

  if (
    responseVerify.message === "" ||
    responseVerify.verificationKeys === "" ||
    responseVerify.date === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
    return;
  }

  // Security: never log the user's input, only the outcome.
  try {
    const result = await verify({
      message: responseVerify.message,
      verificationKeys: responseVerify.verificationKeys,
      date: new Date(),
    });
    if (result.verified) {
      console.log(
        `\n✅ Signature verified (key ID ${result.keyIDs.join(", ")}).\n`,
      );
    } else {
      console.error("\n❌ The signature did not verify.\n");
    }
  } catch (error) {
    console.error(
      `\n❌ Could not verify: ${(error as Error).message}. Provide a clear-signed message and a base64-encoded armored public key.\n`,
    );
  }
};
/** Default export of the handleVerify command handler. */
export default handleVerify;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
