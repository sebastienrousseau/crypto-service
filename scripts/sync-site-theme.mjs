#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Keeps the docs portal (website/) on the same PRISM design as
// crypto-service.co without a network dependency. website/THEME.lock.json
// names every file vendored from the site repository, the site commit it
// came from and the SHA-256 of each copy.
//
//   node scripts/sync-site-theme.mjs --from <site-checkout>
//     copies every locked file from the checkout into website/ and
//     rewrites the lock with the checkout's commit and the new hashes.
//   node scripts/sync-site-theme.mjs --check
//     verifies every vendored file against the lock; exits 1 and lists
//     the files that are missing or differ (a local edit, or a partial
//     sync). Offline: it never reads the site repository.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WEBSITE = join(ROOT, "website");
const LOCK = join(WEBSITE, "THEME.lock.json");
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;

/** Lowercase hex SHA-256 of `bytes`. */
export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A relative path that stays inside its root: no `..`, no absolute. */
function isContained(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.split("/").includes("..")
  );
}

function checkEntry(entry, index) {
  const where = `files[${index}]`;
  if (!isContained(entry?.from) || !isContained(entry?.to)) {
    throw new Error(`${where} needs relative "from" and "to" paths`);
  }
  if (entry.sha256 !== "" && !SHA256.test(entry.sha256 ?? "")) {
    throw new Error(`${where} (${entry.to}) has a malformed sha256`);
  }
}

/** Parse and validate the lock; throws on any structural fault. */
export function parseLock(text) {
  const lock = JSON.parse(text);
  if (!COMMIT.test(lock?.source?.commit ?? "") && lock?.source?.commit !== "") {
    throw new Error("source.commit is not a 40-hex commit SHA");
  }
  if (!Array.isArray(lock.files) || lock.files.length === 0) {
    throw new Error("files must be a non-empty array");
  }
  lock.files.forEach(checkEntry);
  const targets = new Set(lock.files.map((f) => f.to));
  if (targets.size !== lock.files.length) {
    throw new Error("two entries vendor to the same path");
  }
  return lock;
}

/**
 * Compare every vendored file with the lock. `read(to)` returns the
 * file's bytes, or undefined when it does not exist. Returns one line
 * per problem; an empty list means the copies match.
 */
export function verify(lock, read) {
  const problems = [];
  for (const { to, sha256: expected } of lock.files) {
    const bytes = read(to);
    if (bytes === undefined) {
      problems.push(`${to}: missing`);
    } else if (sha256(bytes) !== expected) {
      problems.push(`${to}: sha256 ${sha256(bytes)}, lock has ${expected}`);
    }
  }
  return problems;
}

/** The lock re-stamped with `commit` and each file's hash from `hashOf`. */
export function restamp(lock, commit, hashOf) {
  if (!COMMIT.test(commit)) throw new Error(`not a commit SHA: ${commit}`);
  return {
    ...lock,
    source: { ...lock.source, commit },
    files: lock.files.map((f) => ({ ...f, sha256: hashOf(f.from) })),
  };
}

/** The lock as written to disk: two-space JSON, trailing newline. */
export function formatLock(lock) {
  return `${JSON.stringify(lock, null, 2)}\n`;
}

/** `--check`, or `--from <dir>`; anything else is a usage error. */
export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--check") return { mode: "check" };
  if (argv.length === 2 && argv[0] === "--from" && argv[1] !== "") {
    return { mode: "from", site: argv[1] };
  }
  throw new Error(
    "usage: sync-site-theme.mjs --check | --from <site-checkout>",
  );
}

function readOrUndefined(path) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function check(lock) {
  const problems = verify(lock, (to) => readOrUndefined(join(WEBSITE, to)));
  if (problems.length > 0) {
    console.error(
      "sync-site-theme: vendored files differ from website/THEME.lock.json;" +
        " re-sync with --from <site-checkout>:",
    );
    problems.forEach((p) => console.error(`  ${p}`));
    return false;
  }
  console.log(`sync-site-theme: ok (${lock.files.length} files)`);
  return true;
}

function syncFrom(lock, site) {
  const commit = execFileSync("git", ["-C", site, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  for (const { from, to } of lock.files) {
    const target = join(WEBSITE, to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(site, from), target);
  }
  const next = restamp(lock, commit, (from) =>
    sha256(readFileSync(join(site, from))),
  );
  writeFileSync(LOCK, formatLock(next));
  console.log(
    `sync-site-theme: ${next.files.length} files from ${commit.slice(0, 12)}`,
  );
  return true;
}

function main(argv) {
  const args = parseArgs(argv);
  const lock = parseLock(readFileSync(LOCK, "utf8"));
  return args.mode === "check" ? check(lock) : syncFrom(lock, args.site);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)) ? 0 : 1);
  } catch (error) {
    console.error(`sync-site-theme: ${error.message}`);
    process.exit(2);
  }
}
