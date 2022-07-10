#!/usr/bin/env node

import { Command } from './commands/index'
import { welcome } from "./helpers/banner";
import { language, locale, constants } from "./constants/index"
import { writeUtils } from "./utils/write.utils";
import format from 'kleur';
import prompts from 'prompts';

language(locale);
console.clear();
welcome(constants.CLI_TITLE);
writeUtils.writeLn(constants.CLI_TITLE);
writeUtils.writeLn("");
writeUtils.writeLn(constants.CLI_DESCRIPTION);
writeUtils.writeLn("");

(async () => {
  const response = await prompts({
    type: 'select',
    name: constants.PROMPT_SELECT_TTL,
    message: constants.PROMPT_SELECT_DES+"\n\n",
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

// # sourceMappingURL=cli.js.map
// Language: typescript
// Path: packages/crypto-cli/src/cli.ts
