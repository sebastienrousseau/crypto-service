#!/usr/bin/env node

import { Command } from "./commands/index";
import { welcome } from "./helpers/banner";
import { constants } from "./constants/index";
import { writeUtils } from "./utils/write.utils";
import format from "kleur";
import prompts from "prompts";

async function main(): Promise<void> {
  console.clear();
  welcome(constants.CLI_TITLE);
  writeUtils.writeLn(constants.CLI_TITLE);
  writeUtils.writeLn("");
  writeUtils.writeLn(constants.CLI_DESCRIPTION);
  writeUtils.writeLn("");

  const response = await prompts({
    type: "select",
    name: "selection",
    message: constants.PROMPT_SELECT_DES + "\n\n",
    choices: [
      { title: constants.CLI_FN_1_TTL, description: constants.CLI_FN_1_DES, value: "generate" },
      { title: constants.CLI_FN_2_TTL, description: constants.CLI_FN_2_DES, value: "encrypt" },
      { title: constants.CLI_FN_3_TTL, description: constants.CLI_FN_3_DES, value: "decrypt" },
      { title: constants.CLI_FN_4_TTL, description: constants.CLI_FN_4_DES, value: "reformat" },
      { title: constants.CLI_FN_5_TTL, description: constants.CLI_FN_5_DES, value: "revoke" },
      { title: constants.CLI_FN_6_TTL, description: constants.CLI_FN_6_DES, value: "session" },
      { title: constants.CLI_FN_7_TTL, description: constants.CLI_FN_7_DES, value: "sign" },
      { title: constants.CLI_FN_8_TTL, description: constants.CLI_FN_8_DES, value: "verify" },
      { title: constants.CLI_FN_9_TTL, description: constants.CLI_FN_9_DES, value: "help" },
    ],
  });

  switch (response.selection) {
    case "generate":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleGenerate();
      break;
    case "encrypt":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleEncrypt();
      break;
    case "decrypt":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleDecrypt();
      break;
    case "reformat":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleReformat();
      break;
    case "revoke":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleRevoke();
      break;
    case "session":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleSession();
      break;
    case "sign":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleSign();
      break;
    case "verify":
      writeUtils.writeLn(format.green(constants.CLI_HDL_1_DES));
      await Command.handleVerify();
      break;
    case "help":
      writeUtils.writeLn(format.green(constants.CLI_FN_9_TTL));
      await Command.handleHelp();
      break;
    default:
      writeUtils.writeLn(format.red(constants.CLI_ERR_1));
      process.exitCode = 1;
      break;
  }
}

main().catch((err) => {
  writeUtils.writeLn(format.red(`Error: ${err instanceof Error ? err.message : String(err)}`), false, true);
  process.exit(1);
});
