// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MeteringEngine } from "../src/enterprise/metering";
import type { LicenseTier } from "../src/enterprise/types";

// Characterisation net for MeteringEngine.checkRequest: one scripted
// session with explicit timestamps that drains a bucket, refills it,
// rejects oversized payloads, moves the clock backwards and evicts a
// tenant. Each step records the result and the number of tracked
// tenants; the expected values are in fixtures/metering.golden.json.

type Step = [
  tenant: string,
  tier: LicenseTier,
  bytes: number | undefined,
  nowMs: number,
];

export function script(): Step[] {
  const steps: Step[] = [];
  // Drain the community bucket (60 a minute) within one millisecond.
  for (let i = 0; i < 62; i++) steps.push(["a", "community", undefined, 1_000]);
  steps.push(
    ["a", "community", 0, 1_500],
    ["a", "community", 100, 2_000],
    ["a", "community", 1024 * 1024, 30_000],
    ["a", "community", 1024 * 1024 + 1, 30_001],
    ["a", "community", 10, 29_000],
    ["a", "community", 10, 95_123],
    ["b", "enterprise", 10 * 1024 * 1024 + 1, 1_000],
    ["b", "enterprise", 5, 61_000],
    ["c", "sovereign", 50 * 1024 * 1024, 7_777],
    ["d", "community", undefined, 8_000],
    ["a", "community", undefined, 200_000],
  );
  return steps;
}

export function runScript(): unknown[] {
  const engine = new MeteringEngine(3);
  return script().map(([tenant, tier, bytes, nowMs]) => ({
    step: [tenant, tier, bytes ?? null, nowMs],
    result: engine.checkRequest(tenant, tier, bytes, nowMs),
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
