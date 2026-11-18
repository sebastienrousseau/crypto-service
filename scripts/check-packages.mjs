#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Package-boundary check for every publishable package: publint lints
// the manifest against the files that would be published (exports,
// main, types, bin), and Are the Types Wrong (attw) resolves every
// entry point of the packed tarball under each TypeScript module
// resolution mode, as a consumer's compiler would. Both run on the
// output of `pnpm pack`, so workspace: specifiers are rewritten exactly
// as on publish. Requires a prior build (`pnpm -r run build`).
//
// Every publint message (error, warning or suggestion) and every attw
// problem fails the check. No attw rule is ignored and the default
// profile is used, so node10, node16 (CJS and ESM) and bundler
// resolution must all find types for each exported subpath.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import { runIfMain } from "./lib/cli.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ATTW = join(ROOT, "node_modules", ".bin", "attw");

/** Directories of the packages under `root` that are published to npm. */
export function publishableDirs(root) {
  return readdirSync(join(root, "packages"))
    .filter((d) => d.startsWith("crypto-"))
    .map((d) => join(root, "packages", d))
    .filter((dir) => !readManifest(dir).private);
}

function readManifest(dir) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

/** publint findings for one package, formatted one per line. */
export async function runPublint(dir) {
  const pkg = readManifest(dir);
  const { messages } = await publint({
    pkgDir: dir,
    level: "suggestion",
    strict: true,
    pack: "pnpm",
  });
  return messages.map((m) => `publint ${m.type}: ${formatMessage(m, pkg)}`);
}

/** Pack the package with pnpm and return the tarball path. */
export function pack(dir, dest) {
  const out = execFileSync("pnpm", ["pack", "--pack-destination", dest], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out.trim().split("\n").pop();
}

/** attw report for one tarball, or an empty list when it passes. */
export function runAttw(tarball, attw = ATTW) {
  try {
    execFileSync(attw, [tarball, "--format", "ascii"], { encoding: "utf8" });
    return [];
  } catch (err) {
    return [`attw:\n${err.stdout}${err.stderr}`];
  }
}

const DEFAULTS = {
  root: ROOT,
  lint: runPublint,
  packTo: pack,
  types: runAttw,
  log: console.log,
  error: console.error,
};

/** Check every publishable package under `root`; resolves to the exit code. */
export async function main(argv, options = {}) {
  const { root, lint, packTo, types, log, error } = {
    ...DEFAULTS,
    ...options,
  };
  const work = mkdtempSync(join(tmpdir(), "check-packages-"));
  const problems = [];
  const dirs = publishableDirs(root);
  try {
    for (const dir of dirs) {
      const { name } = readManifest(dir);
      const found = [...(await lint(dir)), ...types(packTo(dir, work))];
      for (const f of found) problems.push(`${name}: ${f}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (problems.length > 0) {
    error("packages: boundary problems found");
    for (const p of problems) error(`  ${p}`);
    return 1;
  }
  log(`packages: ok (${dirs.length} packages, publint + attw)`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "check-packages" });
