// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Shared display helpers for crypto-wasm examples.
 *
 * Provides animated spinner + checkmark output inspired by
 * charmbracelet/bubbletea's package-manager example.
 */

const SPINNER = ["\u2807", "\u280b", "\u2819", "\u2838", "\u2834", "\u2826", "\u2847", "\u280f"];
const CHECK = "\u2713";
const CROSS = "\u2717";

/** Print the example header. */
export function header(title: string): void {
  console.log();
  console.log(`  \x1b[1m${title}\x1b[0m`);
  console.log();
}

/** Print the footer. */
export function footer(): void {
  console.log();
}

/** Sleep helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a task with an animated spinner, then show a checkmark.
 *
 * The callback should return its result — do not print to stdout.
 */
export async function task<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
  let frame = 0;
  const interval = setInterval(() => {
    const s = SPINNER[frame % SPINNER.length];
    process.stdout.write(`\r  \x1b[36m${s}\x1b[0m \x1b[90m${label}\x1b[0m\x1b[K`);
    frame++;
  }, 80);

  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r  \x1b[32m${CHECK}\x1b[0m ${label}\x1b[K\n`);
    return result;
  } catch (err) {
    clearInterval(interval);
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`\r  \x1b[31m${CROSS}\x1b[0m ${label} \x1b[90m(${msg})\x1b[0m\x1b[K\n`);
    throw err;
  }
}

/**
 * Run a task and print additional detail lines beneath the checkmark.
 */
export async function taskWithOutput(label: string, fn: () => string[] | Promise<string[]>): Promise<void> {
  const lines = await task(label, fn);
  for (const line of lines) {
    console.log(`    \x1b[90m${line}\x1b[0m`);
  }
}

/**
 * Run a task that may fail. Shows checkmark on success, cross on failure.
 */
export async function taskResult<T>(label: string, fn: () => T | Promise<T>): Promise<T | null> {
  try {
    return await task(label, fn);
  } catch {
    return null;
  }
}

/** Show a summary line. */
export function summary(count: number): void {
  console.log();
  console.log(`  \x1b[1;32m${CHECK} ${count} operations completed.\x1b[0m`);
  console.log();
}
