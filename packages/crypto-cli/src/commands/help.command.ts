import { writeUtils } from "../utils/write.utils";
import prompts from "prompts";
import { language, locale, constants } from "../constants/index";
import type { Translations } from "../constants/index";

type Key = keyof Translations;

language(locale);

/**
 * Menu entries: translation keys for the title and description, and the
 * selection value. Keys, not strings, so the active language is read
 * when help is shown.
 */
const CHOICES: Array<{ title: Key; description: Key; value: string }> = [
  {
    title: "CLI_FN_3_TTL",
    description: "CLI_FN_3_LG_DES",
    value: "1",
  },
  {
    title: "CLI_FN_2_TTL",
    description: "CLI_FN_2_LG_DES",
    value: "2",
  },
  {
    title: "CLI_FN_1_TTL",
    description: "CLI_FN_1_LG_DES",
    value: "3",
  },
  {
    title: "CLI_FN_4_TTL",
    description: "CLI_FN_4_LG_DES",
    value: "4",
  },
  {
    title: "CLI_FN_5_TTL",
    description: "CLI_FN_5_LG_DES",
    value: "5",
  },
  {
    title: "CLI_FN_6_TTL",
    description: "CLI_FN_6_LG_DES",
    value: "6",
  },
  {
    title: "CLI_FN_7_TTL",
    description: "CLI_FN_7_LG_DES",
    value: "7",
  },
  {
    title: "CLI_FN_8_TTL",
    description: "CLI_FN_8_LG_DES",
    value: "8",
  },
];

/** Translation keys of each help page's lines, by selection value. */
const PAGES = new Map<string, Key[]>([
  // Decrypt
  [
    "1",
    [
      "PROMPT_HLP_DEC_DES",
      "PROMPT_HLP_DEC_USAGE",
      "PROMPT_HLP_DEC_OPTIONS",
      "PROMPT_HLP_DEC_OPT_1",
      "PROMPT_HLP_DEC_OPT_2",
      "PROMPT_HLP_DEC_OPT_3",
    ],
  ],
  // Encrypt
  [
    "2",
    [
      "PROMPT_HLP_ENC_DES",
      "PROMPT_HLP_ENC_USAGE",
      "PROMPT_HLP_ENC_OPTIONS",
      "PROMPT_HLP_ENC_OPT_1",
      "PROMPT_HLP_ENC_OPT_2",
      "PROMPT_HLP_ENC_OPT_3",
    ],
  ],
  // Generate
  [
    "3",
    [
      "PROMPT_HLP_GEN_DES",
      "PROMPT_HLP_GEN_USAGE",
      "PROMPT_HLP_GEN_OPTIONS",
      "PROMPT_HLP_GEN_OPT_1",
      "PROMPT_HLP_GEN_OPT_2",
      "PROMPT_HLP_GEN_OPT_3",
      "PROMPT_HLP_GEN_OPT_4",
      "PROMPT_HLP_GEN_OPT_5",
      "PROMPT_HLP_GEN_OPT_6",
      "PROMPT_HLP_GEN_OPT_7",
      "PROMPT_HLP_GEN_OPT_8",
    ],
  ],
  // Reformat
  [
    "4",
    [
      "PROMPT_HLP_REF_DES",
      "PROMPT_HLP_REF_USAGE",
      "PROMPT_HLP_REF_OPTIONS",
      "PROMPT_HLP_REF_OPT_1",
      "PROMPT_HLP_REF_OPT_2",
      "PROMPT_HLP_REF_OPT_3",
      "PROMPT_HLP_REF_OPT_4",
      "PROMPT_HLP_REF_OPT_5",
    ],
  ],
  // Revoke
  [
    "5",
    [
      "PROMPT_HLP_RVK_DES",
      "PROMPT_HLP_RVK_USAGE",
      "PROMPT_HLP_RVK_OPTIONS",
      "PROMPT_HLP_RVK_OPT_1",
      "PROMPT_HLP_RVK_OPT_2",
      "PROMPT_HLP_RVK_OPT_3",
    ],
  ],
  // Session
  [
    "6",
    [
      "PROMPT_HLP_SES_DES",
      "PROMPT_HLP_SES_USAGE",
      "PROMPT_HLP_SES_OPT_1",
      "PROMPT_HLP_SES_OPT_2",
    ],
  ],
  // Sign
  [
    "7",
    [
      "PROMPT_HLP_SGN_DES",
      "PROMPT_HLP_SGN_USAGE",
      "PROMPT_HLP_SGN_OPT_1",
      "PROMPT_HLP_SGN_OPT_2",
      "PROMPT_HLP_SGN_OPT_3",
      "PROMPT_HLP_SGN_OPT_4",
      "PROMPT_HLP_SGN_OPT_5",
    ],
  ],
  // Verify
  [
    "8",
    [
      "PROMPT_HLP_VRF_DES",
      "PROMPT_HLP_VRF_USAGE",
      "PROMPT_HLP_VRF_OPT_1",
      "PROMPT_HLP_VRF_OPT_2",
    ],
  ],
]);

/**
 * Display interactive help for available CLI commands.
 *
 * @example
 * ```ts
 * await handleHelp();
 * ```
 */
const handleHelp = async () => {
  const responseHelp = await prompts([
    {
      type: "select",
      name: constants.PROMPT_SELECT_TTL,
      message: constants.PROMPT_SELECT_DES_HLP,
      choices: CHOICES.map(({ title, description, value }) => ({
        title: constants[title],
        description: constants[description],
        value,
      })),
    },
  ]);

  const page = PAGES.get(responseHelp.Selection);
  if (!page) {
    writeUtils.writeLn(constants.CLI_ERR_2);
    return;
  }
  // Each line is preceded by a blank one, and the page ends with one.
  for (const key of page) {
    writeUtils.writeLn("");
    writeUtils.writeLn(constants[key]);
  }
  writeUtils.writeLn("");
};
/** Default export of the handleHelp command handler. */
export default handleHelp;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
