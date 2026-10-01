/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command } from "commander";
import { buildProgram, EXIT, processIO } from "./index";

/** Markers around the generated usage block in README.md. */
export const USAGE_MARKERS = {
  start: "<!-- cli-usage:start (generated: pnpm run readme:usage) -->",
  end: "<!-- cli-usage:end -->",
} as const;

/** Every command of the tree, depth first, with its full name. */
const walk = (command: Command, prefix: string): [string, Command][] => {
  const name = prefix ? `${prefix} ${command.name()}` : command.name();
  return [
    [name, command],
    ...command.commands.flatMap((sub) => walk(sub, name)),
  ];
};

/**
 * The Markdown usage reference of every command, derived from the
 * command definitions (the help text at 80 columns), between
 * {@link USAGE_MARKERS}.
 */
export const renderUsage = (): string => {
  // No action runs, so nothing is read or written.
  const program = buildProgram({ io: processIO(), exitCode: EXIT.OK }, "");
  const sections = walk(program, "").map(([name, command]) => {
    command.configureHelp({ helpWidth: 80 });
    return `#### \`${name}\`\n\n\`\`\`text\n${command.helpInformation()}\`\`\`\n`;
  });
  return [USAGE_MARKERS.start, "", ...sections, USAGE_MARKERS.end].join("\n");
};

/**
 * Replace the usage block of `readme` with {@link renderUsage}.
 *
 * @param readme - README.md text containing {@link USAGE_MARKERS}.
 * @throws When either marker is missing.
 */
export const replaceUsage = (readme: string): string => {
  const start = readme.indexOf(USAGE_MARKERS.start);
  const end = readme.indexOf(USAGE_MARKERS.end);
  if (start < 0 || end < start) {
    throw new Error("README.md has no cli-usage block");
  }
  return (
    readme.slice(0, start) +
    renderUsage() +
    readme.slice(end + USAGE_MARKERS.end.length)
  );
};
