/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, Option } from "commander";
import {
  generateKeyPair,
  KEY_ALGORITHMS,
  type GeneratedKeyPair,
  type KeyAlgorithm,
  type KeyMetadata,
} from "@sebastienrousseau/crypto-lib/keys";
import { emit, type RunContext } from "./io";

/** Options of `crypto-cli keygen`. */
interface KeygenOptions {
  algorithm: KeyAlgorithm;
  kid?: string;
  use?: "sig" | "enc";
  json?: boolean;
}

/** The human-readable rendering of a generated key pair. */
const describe = (key: GeneratedKeyPair) =>
  [
    `Algorithm: ${key.algorithm}`,
    `Key ID:    ${key.kid}`,
    `Public:    ${key.publicKey}`,
    `Private:   ${key.privateKey}`,
  ].join("\n");

/**
 * Register `keygen`: generate a key pair. The private key is written to
 * stdout, as in the interactive menu.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerKeygen = (program: Command, ctx: RunContext) =>
  program
    .command("keygen")
    .description("Generate a key pair (the private key is printed to stdout)")
    .addOption(
      new Option("-a, --algorithm <name>", "key algorithm")
        .choices(KEY_ALGORITHMS)
        .makeOptionMandatory(),
    )
    .option("--kid <id>", "key ID (default: thumbprint of the public key)")
    .addOption(
      new Option("--use <use>", "intended key usage").choices(["sig", "enc"]),
    )
    .option("--json", "print the key pair as one line of JSON")
    .action((opts: KeygenOptions) => {
      const metadata: KeyMetadata = {};
      if (opts.kid !== undefined) metadata.kid = opts.kid;
      if (opts.use !== undefined) metadata.use = opts.use;
      const key = generateKeyPair(opts.algorithm, metadata);
      emit(ctx.io, Boolean(opts.json), key, describe(key));
    });
