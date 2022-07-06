#!/usr/bin/env node

import { Command } from './commands/index'
import { welcome } from "./helpers/banner";
import { constants } from "./constants/index"
import format from 'kleur';
import prompts from 'prompts';

welcome(constants.CLI_TITLE);
console.log(constants.CLI_TITLE);
console.log("\n");
console.log(constants.CLI_DESCRIPTION);
console.log("\n");

(async () => {
  const response = await prompts({
    type: 'select',
    name: constants.PROMPT_SELECT_TTL,
    message: constants.PROMPT_SELECT_DES,
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
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleGenerate();
      break;
    }
    case constants.CLI_FN_2_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleEncrypt();
      break;
    }
    case constants.CLI_FN_3_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleDecrypt();
      break;
    }
    case constants.CLI_FN_4_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleReformat();
      break;
    }
    case constants.CLI_FN_5_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleRevoke();
      break;
    }
    case constants.CLI_FN_6_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleSession();
      break;
    }
    case constants.CLI_FN_7_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleSign();
      break;
    }
    case constants.CLI_FN_8_TTL: {
      console.log(format.green(constants.CLI_HDL_1_DES));
      Command.handleVerify();
      break;
    }
    case constants.CLI_FN_9_TTL: {
      console.log(format.green(constants.CLI_FN_9_TTL));
      Command.handleHelp();
      break;
    }
    default: {
      console.log(format.red(constants.CLI_ERR_1));
      break;
    }
  }
})();

// # sourceMappingURL=cli.js.map
// Language: typescript
// Path: packages/crypto-cli/src/cli.ts
