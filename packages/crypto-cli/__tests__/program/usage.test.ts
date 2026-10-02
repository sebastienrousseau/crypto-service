/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * The README command reference must match the command definitions.
 */
import { expect } from "chai";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  renderUsage,
  replaceUsage,
  USAGE_MARKERS,
} from "../../src/program/usage";

const README = path.join(__dirname, "..", "..", "README.md");
const SUBCOMMANDS = [
  "crypto-cli",
  "crypto-cli hash",
  "crypto-cli keygen",
  "crypto-cli encrypt",
  "crypto-cli decrypt",
  "crypto-cli sign",
  "crypto-cli verify",
  "crypto-cli password",
  "crypto-cli password hash",
  "crypto-cli password verify",
  "crypto-cli cbom",
  "crypto-cli cbom scan",
  "crypto-cli cbom audit",
];

describe("README command reference", () => {
  const readme = fs.readFileSync(README, "utf8").replace(/\r\n/g, "\n");

  it("is up to date (run `pnpm run readme:usage`)", () => {
    expect(replaceUsage(readme)).to.equal(readme);
  });

  it("documents every subcommand", () => {
    const usage = renderUsage();
    for (const name of SUBCOMMANDS) {
      expect(usage).to.include(`#### \`${name}\``);
      expect(readme).to.include(`#### \`${name}\``);
    }
    expect(usage.match(/^#### /gm)).to.have.length(SUBCOMMANDS.length);
  });

  it("replaces only the marked block", () => {
    const doc = `before\n${USAGE_MARKERS.start}\nstale\n${USAGE_MARKERS.end}\nafter\n`;
    const updated = replaceUsage(doc);
    expect(updated.startsWith("before\n")).to.be.true;
    expect(updated.endsWith("\nafter\n")).to.be.true;
    expect(updated).not.to.include("stale");
    expect(updated).to.include("Usage: crypto-cli hash [options] [file]");
  });

  it("rejects a README without the markers", () => {
    expect(() => replaceUsage("no markers")).to.throw("no cli-usage block");
    expect(() => replaceUsage(USAGE_MARKERS.start)).to.throw(
      "no cli-usage block",
    );
  });
});
