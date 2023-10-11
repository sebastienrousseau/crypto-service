import { writeUtils } from "../utils/write.utils";
import prompts from "prompts";
import { language, locale, constants } from "../constants/index";

language(locale);

const handleHelp = async () => {
  const responseHelp = await prompts([
    {
      type: "select",
      name: constants.PROMPT_SELECT_TTL,
      message: constants.PROMPT_SELECT_DES_HLP,
      choices: [
        {
          title: constants.CLI_FN_3_TTL,
          description: constants.CLI_FN_3_LG_DES,
          value: "1",
        },
        {
          title: constants.CLI_FN_2_TTL,
          description: constants.CLI_FN_2_LG_DES,
          value: "2",
        },
        {
          title: constants.CLI_FN_1_TTL,
          description: constants.CLI_FN_1_LG_DES,
          value: "3",
        },
        {
          title: constants.CLI_FN_4_TTL,
          description: constants.CLI_FN_4_LG_DES,
          value: "4",
        },
        {
          title: constants.CLI_FN_5_TTL,
          description: constants.CLI_FN_5_LG_DES,
          value: "5",
        },
        {
          title: constants.CLI_FN_6_TTL,
          description: constants.CLI_FN_6_LG_DES,
          value: "6",
        },
        {
          title: constants.CLI_FN_7_TTL,
          description: constants.CLI_FN_7_LG_DES,
          value: "7",
        },
        {
          title: constants.CLI_FN_8_TTL,
          description: constants.CLI_FN_8_LG_DES,
          value: "8",
        },
      ],
    },
  ]);

  switch (responseHelp.Selection) {
    case "1": {
      // Decrypt
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_OPTIONS);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_DEC_OPT_3);
      writeUtils.writeLn("");
      break;
    }
    case "2": {
      // Encrypt
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_OPTIONS);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_ENC_OPT_3);
      writeUtils.writeLn("");
      break;
    }
    case "3": {
      // Generate
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPTIONS);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_3);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_4);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_5);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_6);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_7);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_GEN_OPT_8);
      writeUtils.writeLn("");
      break;
    }
    case "4": {
      // Reformat
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPTIONS);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPT_3);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPT_4);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_REF_OPT_5);
      writeUtils.writeLn("");
      break;
    }
    case "5": {
      // Revoke
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_OPTIONS);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_RVK_OPT_3);
      writeUtils.writeLn("");
      break;
    }
    case "6": {
      // Session
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SES_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SES_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SES_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SES_OPT_2);
      writeUtils.writeLn("");
      break;
    }
    case "7": {
      // Sign
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_OPT_2);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_OPT_3);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_OPT_4);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_SGN_OPT_5);
      writeUtils.writeLn("");
      break;
    }
    case "8": {
      // Verify
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_VRF_DES);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_VRF_USAGE);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_VRF_OPT_1);
      writeUtils.writeLn("");
      writeUtils.writeLn(constants.PROMPT_HLP_VRF_OPT_2);
      writeUtils.writeLn("");
      break;
    }
    default: {
      writeUtils.writeLn(constants.CLI_ERR_2);
      break;
    }
  }
};
export default handleHelp;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
