/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Tests for the interactive menu shown on a TTY with no arguments.
 */
import { expect } from "chai";
import prompts from "prompts";
import { Command } from "../../src/commands/index";
import { constants } from "../../src/constants/index";
import { menuEntries, runMenu } from "../../src/menu";
import { writeUtils } from "../../src/utils/write.utils";

describe("Interactive menu", () => {
  let lines: string[] = [];
  const saved = {
    writeLn: writeUtils.writeLn,
    clear: console.clear,
    log: console.log,
    cbom: Command.handleModernCbom,
  };

  beforeEach(() => {
    lines = [];
    writeUtils.writeLn = (s: string) => {
      lines.push(s);
    };
    console.clear = () => undefined;
    console.log = () => undefined;
  });

  afterEach(() => {
    writeUtils.writeLn = saved.writeLn;
    console.clear = saved.clear;
    console.log = saved.log;
    Command.handleModernCbom = saved.cbom;
  });

  it("lists 15 entries, each bound to a registered handler", () => {
    const entries = menuEntries();
    expect(entries).to.have.length(15);
    for (const entry of entries) {
      expect(Command[entry.handler]).to.be.a("function");
      expect(entry.title).to.be.a("string").and.not.empty;
    }
    expect(new Set(entries.map((e) => e.title)).size).to.equal(15);
  });

  it("runs the selected entry's handler after its heading", async () => {
    let calls = 0;
    Command.handleModernCbom = async () => {
      calls += 1;
    };
    prompts.inject(["CBOM"]);
    await runMenu();
    expect(calls).to.equal(1);
    expect(lines.join("\n")).to.include(
      "Cryptographic Bill of Materials (CBOM)",
    );
  });

  it("reports a cancelled selection", async () => {
    prompts.inject([undefined]);
    await runMenu();
    expect(lines[lines.length - 1]).to.include(constants.CLI_ERR_1);
  });
});
