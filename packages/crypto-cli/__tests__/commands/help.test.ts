// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import prompts from "prompts";
import handleHelp from "../../src/commands/help.command";
import { writeUtils } from "../../src/utils/write.utils";

// Characterisation net for handleHelp: every menu selection, and one
// that is not on the menu, with each line it writes. The expected
// output is in fixtures/help.golden.json.

export const SELECTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export async function runSelections(): Promise<Record<string, unknown[][]>> {
  const original = writeUtils.writeLn;
  const out: Record<string, unknown[][]> = {};
  try {
    for (const selection of SELECTIONS) {
      const calls: unknown[][] = [];
      writeUtils.writeLn = (...args: unknown[]) => {
        calls.push(args);
      };
      prompts.inject([selection]);
      await handleHelp();
      out[selection] = calls;
    }
  } finally {
    writeUtils.writeLn = original;
  }
  return out;
}

describe("handleHelp output", () => {
  it("writes every help page exactly as recorded", async () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/help.golden.json"), "utf8"),
    );
    expect(await runSelections()).to.deep.equal(golden);
  });
});
