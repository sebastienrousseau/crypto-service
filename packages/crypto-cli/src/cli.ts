#!/usr/bin/env node

import { Command } from "./commands/index";
import { welcome } from "./helpers/banner";
import { language, locale, constants } from "./constants/index";
import { writeUtils } from "./utils/write.utils";
import format from "kleur";
import prompts from "prompts";

language(locale);
console.clear();
welcome(constants.CLI_TITLE);
writeUtils.writeLn(constants.CLI_TITLE);
writeUtils.writeLn("");
writeUtils.writeLn(constants.CLI_DESCRIPTION);
writeUtils.writeLn("");

(async () => {
  const response = await prompts({
    type: "select",
    name: constants.PROMPT_SELECT_TTL,
    message: constants.PROMPT_SELECT_DES + "\n\n",
    choices: [
      {
        title: constants.CLI_FN_1_TTL,
        description: constants.CLI_FN_1_DES,
        value: constants.CLI_FN_1_TTL,
      },
      {
        title: constants.CLI_FN_2_TTL,
        description: constants.CLI_FN_2_DES,
        value: constants.CLI_FN_2_TTL,
      },
      {
        title: constants.CLI_FN_3_TTL,
        description: constants.CLI_FN_3_DES,
        value: constants.CLI_FN_3_TTL,
      },
      {
        title: constants.CLI_FN_4_TTL,
        description: constants.CLI_FN_4_DES,
        value: constants.CLI_FN_4_TTL,
      },
      {
        title: constants.CLI_FN_5_TTL,
        description: constants.CLI_FN_5_DES,
        value: constants.CLI_FN_5_TTL,
      },
      {
        title: constants.CLI_FN_6_TTL,
        description: constants.CLI_FN_6_DES,
        value: constants.CLI_FN_6_TTL,
      },
      {
        title: constants.CLI_FN_7_TTL,
        description: constants.CLI_FN_7_DES,
        value: constants.CLI_FN_7_TTL,
      },
      {
        title: constants.CLI_FN_8_TTL,
        description: constants.CLI_FN_8_DES,
        value: constants.CLI_FN_8_TTL,
      },
      // --- Modern Crypto v2 Commands ---
      {
        title: "Modern Keygen",
        description: "Generate keys (Ed25519, ML-DSA, ML-KEM, P-256, etc.)",
        value: "Modern Keygen",
      },
      {
        title: "Modern Hash",
        description: "Hash data (SHA-2, SHA-3, BLAKE2b, BLAKE3)",
        value: "Modern Hash",
      },
      {
        title: "Modern Encrypt",
        description: "Encrypt (XChaCha20, AES-GCM, AES-GCM-SIV)",
        value: "Modern Encrypt",
      },
      {
        title: "Modern Sign",
        description: "Sign/verify (Ed25519, ECDSA, Schnorr, ML-DSA)",
        value: "Modern Sign",
      },
      {
        title: "Password Hash",
        description: "Hash/verify passwords (Argon2id/i/d)",
        value: "Password Hash",
      },
      {
        title: constants.CLI_FN_9_TTL,
        description: constants.CLI_FN_9_DES,
        value: constants.CLI_FN_9_TTL,
      },
    ],
  });

  switch (response.Selection) {
    case constants.CLI_FN_1_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleGenerate();
      break;
    }
    case constants.CLI_FN_2_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleEncrypt();
      break;
    }
    case constants.CLI_FN_3_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleDecrypt();
      break;
    }
    case constants.CLI_FN_4_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleReformat();
      break;
    }
    case constants.CLI_FN_5_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleRevoke();
      break;
    }
    case constants.CLI_FN_6_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleSession();
      break;
    }
    case constants.CLI_FN_7_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleSign();
      break;
    }
    case constants.CLI_FN_8_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      Command.handleVerify();
      break;
    }
    // --- Modern Crypto v2 ---
    case "Modern Keygen": {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green("Modern Key Generation"));
      Command.handleModernKeygen();
      break;
    }
    case "Modern Hash": {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green("Modern Hashing"));
      Command.handleModernHash();
      break;
    }
    case "Modern Encrypt": {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green("Modern Encryption"));
      Command.handleModernEncrypt();
      break;
    }
    case "Modern Sign": {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green("Modern Signing"));
      Command.handleModernSign();
      break;
    }
    case "Password Hash": {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green("Password Hashing (Argon2)"));
      Command.handlePasswordHash();
      break;
    }
    case constants.CLI_FN_9_TTL: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.green(constants.CLI_FN_9_TTL));
      Command.handleHelp();
      break;
    }
    default: {
      writeUtils.writeLn("");
      writeUtils.writeLn(format.red(constants.CLI_ERR_1));
      break;
    }
  }
})();
