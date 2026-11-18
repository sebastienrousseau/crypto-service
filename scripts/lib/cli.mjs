// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau
//
// The command-line entry shared by the repository scripts. Each script
// exports `main(argv)`, resolving to its exit code, and ends with
// `await runIfMain(import.meta.url, main, { name })`: run as
// `node scripts/<name>.mjs` it runs `main` and exits with its code;
// imported by a test it does nothing, so the test calls `main` with its
// own arguments and dependencies.

import { fileURLToPath } from "node:url";

/**
 * Run `main` when the module at `moduleUrl` is the process entry point.
 * A thrown error prints `<name>: <message>` and exits `failureCode`.
 */
export async function runIfMain(
  moduleUrl,
  main,
  { name, failureCode = 1, proc = process, error = console.error },
) {
  if (proc.argv[1] !== fileURLToPath(moduleUrl)) return;
  let code;
  try {
    code = await main(proc.argv.slice(2));
  } catch (caught) {
    error(`${name}: ${caught.message}`);
    code = failureCode;
  }
  proc.exit(code);
}
