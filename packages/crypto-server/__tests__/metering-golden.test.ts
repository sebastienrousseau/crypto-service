// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MeteringEngine } from "../src/enterprise/metering";

// Characterisation net for MeteringEngine.checkRequest: one scripted
// session with explicit timestamps that drains a bucket, refills it,
// counts large payloads, moves the clock backwards and evicts a tenant. Each step records the result and the number of tracked
// tenants; the expected values are in fixtures/metering.golden.json.

type Step = [tenant: string, bytes: number | undefined, nowMs: number];

export function script(): Step[] {
  const steps: Step[] = [];
  // Drain the bucket (60 a minute) within one millisecond.
  for (let i = 0; i < 62; i++) steps.push(["a", undefined, 1_000]);
  steps.push(
    ["a", 0, 1_500],
    ["a", 100, 2_000],
    ["a", 1024 * 1024, 30_000],
    ["a", 1024 * 1024 + 1, 30_001],
    ["a", 10, 29_000],
    ["a", 10, 95_123],
    ["b", 10 * 1024 * 1024 + 1, 1_000],
    ["b", 5, 61_000],
    ["c", 50 * 1024 * 1024, 7_777],
    ["d", undefined, 8_000],
    ["a", undefined, 200_000],
  );
  return steps;
}

export function runScript(): unknown[] {
  const engine = new MeteringEngine(3);
  return script().map(([tenant, bytes, nowMs]) => ({
    step: [tenant, bytes ?? null, nowMs],
    result: engine.checkRequest(tenant, bytes, nowMs),
    size: engine.size,
  }));
}

describe("MeteringEngine.checkRequest session", () => {
  it("meters a scripted session exactly as recorded", () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/metering.golden.json"), "utf8"),
    );
    expect(JSON.parse(JSON.stringify(runScript()))).to.deep.equal(golden);
  });
});
