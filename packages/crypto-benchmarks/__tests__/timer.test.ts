// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { benchmarkOperation, TimerOptions } from "../src/timer";

// Characterisation net for benchmarkOperation: process.hrtime.bigint is
// replaced by a clock that only moves when the measured function runs,
// so every statistic is deterministic. Each case records the stats and
// how many times the function ran; the expected values are in
// fixtures/timer.golden.json.

export const CASES: Array<{
  options?: TimerOptions;
  async?: boolean;
  ramp?: boolean;
}> = [
  {},
  { options: { iterations: 1, warmup: 0 } },
  { options: { iterations: 4 } },
  { options: { iterations: 7, warmup: 3 } },
  { options: { iterations: 20, warmup: 1 }, async: true },
  { options: { iterations: 100 } },
  { options: { iterations: 0, warmup: -1 } },
  { options: { iterations: -5, warmup: 0 } },
  // Every sample distinct, so the percentiles are not just the maximum.
  { options: { iterations: 100, warmup: 0 }, ramp: true },
  { options: { iterations: 50, warmup: 0 }, ramp: true },
];

export async function runCases(): Promise<unknown[]> {
  const original = process.hrtime.bigint;
  let now = 0n;
  process.hrtime.bigint = () => now;
  try {
    const results = [];
    for (const c of CASES) {
      let calls = 0;
      const step = () => {
        calls += 1;
        // 0.25 ms to 3.5 ms in an uneven cycle, in nanoseconds.
        now += c.ramp
          ? BigInt(calls * 10_000)
          : BigInt(((calls * 7919) % 14) * 250_000 + 250_000);
      };
      const fn = c.async ? async () => step() : step;
      const stats = await benchmarkOperation(fn, c.options);
      results.push({ options: c.options ?? null, calls, stats });
    }
    return results;
  } finally {
    process.hrtime.bigint = original;
  }
}

describe("benchmarkOperation statistics", () => {
  it("computes every statistic exactly as recorded", async () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/timer.golden.json"), "utf8"),
    );
    expect(JSON.parse(JSON.stringify(await runCases()))).to.deep.equal(golden);
  });
});
