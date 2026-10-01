/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import format from "kleur";
import prompts from "prompts";
import { Command } from "./commands/index";
import { constants, language, locale } from "./constants/index";
import { welcome } from "./helpers/banner";
import { writeUtils } from "./utils/write.utils";

/** A handler of the {@link Command} registry. */
type Handler = keyof typeof Command;

/** One entry of the interactive menu. */
export interface MenuEntry {
  /** Title shown in the menu, also the selected value. */
  title: string;
  /** Description shown under the title. */
  description: string;
  /** Heading printed before the handler runs. */
  heading: string;
  /** The handler the entry runs. */
  handler: Handler;
}

/** Number of a legacy OpenPGP entry in the translation strings. */
type LegacyNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Legacy OpenPGP entries, titled by the active translation. */
const LEGACY: [LegacyNumber, Handler][] = [
  [1, "handleGenerate"],
  [2, "handleEncrypt"],
  [3, "handleDecrypt"],
  [4, "handleReformat"],
  [5, "handleRevoke"],
  [6, "handleSession"],
  [7, "handleSign"],
  [8, "handleVerify"],
];

/** Modern (v2) entries. */
const MODERN: MenuEntry[] = [
  {
    title: "Modern Keygen",
    description: "Generate keys (Ed25519, ML-DSA, ML-KEM, P-256, etc.)",
    heading: "Modern Key Generation",
    handler: "handleModernKeygen",
  },
  {
    title: "Modern Hash",
    description: "Hash data (SHA-2, SHA-3, BLAKE2b, BLAKE3)",
    heading: "Modern Hashing",
    handler: "handleModernHash",
  },
  {
    title: "Modern Encrypt",
    description: "Encrypt (XChaCha20, AES-GCM, AES-GCM-SIV)",
    heading: "Modern Encryption",
    handler: "handleModernEncrypt",
  },
  {
    title: "Modern Sign",
    description: "Sign/verify (Ed25519, ECDSA, Schnorr, ML-DSA)",
    heading: "Modern Signing",
    handler: "handleModernSign",
  },
  {
    title: "Password Hash",
    description: "Hash/verify passwords (Argon2id/i/d)",
    heading: "Password Hashing (Argon2)",
    handler: "handlePasswordHash",
  },
  {
    title: "CBOM",
    description: "Generate or audit Cryptographic Bill of Materials",
    heading: "Cryptographic Bill of Materials (CBOM)",
    handler: "handleModernCbom",
  },
];

/** The menu entries, in display order, in the active language. */
export const menuEntries = (): MenuEntry[] => [
  ...LEGACY.map(([n, handler]) => ({
    title: constants[`CLI_FN_${n}_TTL`],
    description: constants[`CLI_FN_${n}_DES`],
    heading: constants.CLI_HDL_1_DES,
    handler,
  })),
  ...MODERN,
  {
    title: constants.CLI_FN_9_TTL,
    description: constants.CLI_FN_9_DES,
    heading: constants.CLI_FN_9_TTL,
    handler: "handleHelp",
  },
];

/**
 * Show the banner, ask which operation to run and run its handler.
 * Only for an interactive terminal; see `main` in `./program`.
 */
export const runMenu = async (): Promise<void> => {
  language(locale);
  console.clear();
  welcome(constants.CLI_TITLE);
  writeUtils.writeLn(constants.CLI_TITLE);
  writeUtils.writeLn("");
  writeUtils.writeLn(constants.CLI_DESCRIPTION);
  writeUtils.writeLn("");

  const entries = menuEntries();
  const response = await prompts({
    type: "select",
    name: constants.PROMPT_SELECT_TTL,
    message: constants.PROMPT_SELECT_DES + "\n\n",
    choices: entries.map(({ title, description }) => ({
      title,
      description,
      value: title,
    })),
  });
  const selected = response[constants.PROMPT_SELECT_TTL];
  const entry = entries.find((e) => e.title === selected);

  writeUtils.writeLn("");
  if (!entry) {
    writeUtils.writeLn(format.red(constants.CLI_ERR_1));
    return;
  }
  writeUtils.writeLn(format.green(entry.heading));
  await Command[entry.handler]();
};
