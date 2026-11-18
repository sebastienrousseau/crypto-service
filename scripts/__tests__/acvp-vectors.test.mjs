// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fixtureOf, main, pick, SETS } from "../acvp-vectors.mjs";

const set = (name) => SETS.find((s) => s.name === name);

/** A test group every set keeps: deterministic, external, pure, fast. */
const GROUP = {
  deterministic: true,
  signatureInterface: "external",
  preHash: "pure",
  parameterSet: "SLH-DSA-SHA2-128f",
};

/** Cases of increasing size; `testPassed: false` on the largest. */
const cases = (n) =>
  Array.from({ length: n }, (_, i) => ({
    tcId: i + 1,
    sk: "aa",
    additionalRandomness: "bb",
    message: "cc".repeat(i + 1),
    testPassed: i < n - 1,
  }));

describe("pick", () => {
  it("keeps the n smallest cases", () => {
    const tests = cases(4).map((t) => ({ ...t, testPassed: true }));
    assert.deepEqual(
      pick(tests.toReversed(), 2).map((t) => t.tcId),
      [1, 2],
    );
  });
  it("swaps in a failing case when none of the smallest fails", () => {
    assert.deepEqual(
      pick(cases(4), 2).map((t) => t.tcId),
      [1, 4],
    );
  });
  it("keeps a failing case already chosen", () => {
    const tests = cases(2);
    assert.deepEqual(
      pick(tests, 2).map((t) => t.tcId),
      [1, 2],
    );
  });
});

describe("SETS", () => {
  it("keeps only the groups crypto-lib runs", () => {
    const keeps = (name, group) => set(name).keep({ ...GROUP, ...group });
    assert.equal(keeps("ML-KEM-keyGen-FIPS203", {}), true);
    assert.equal(keeps("ML-DSA-sigGen-FIPS204", {}), true);
    assert.equal(
      keeps("ML-DSA-sigGen-FIPS204", { deterministic: false }),
      false,
    );
    assert.equal(keeps("ML-DSA-sigVer-FIPS204", { preHash: "preHash" }), false);
    assert.equal(keeps("SLH-DSA-sigGen-FIPS205", {}), true);
    assert.equal(
      keeps("SLH-DSA-sigGen-FIPS205", { parameterSet: "SLH-DSA-SHA2-128s" }),
      false,
    );
    assert.equal(
      keeps("SLH-DSA-sigVer-FIPS205", { signatureInterface: "internal" }),
      false,
    );
  });
});

describe("fixtureOf", () => {
  const full = (groups) => ({
    algorithm: "A",
    mode: "m",
    revision: "FIPS1",
    testGroups: groups,
  });

  it("filters groups, picks cases and drops the set's fields", () => {
    const fixture = fixtureOf(
      set("SLH-DSA-sigVer-FIPS205"),
      full([
        { ...GROUP, tgId: 1, tests: cases(3) },
        { ...GROUP, tgId: 2, preHash: "preHash", tests: cases(3) },
      ]),
    );
    assert.equal(fixture.generatedBy, "scripts/acvp-vectors.mjs");
    assert.match(fixture.source, /\/SLH-DSA-sigVer-FIPS205$/);
    assert.deepEqual(
      [fixture.algorithm, fixture.mode, fixture.revision],
      ["A", "m", "FIPS1"],
    );
    assert.equal(fixture.testGroups.length, 1);
    assert.deepEqual(fixture.testGroups[0].tests[0], {
      tcId: 1,
      message: "cc",
      testPassed: true,
    });
  });
  it("keeps every field when the set drops none", () => {
    const fixture = fixtureOf(
      set("ML-KEM-keyGen-FIPS203"),
      full([{ tgId: 1, tests: cases(1) }]),
    );
    assert.equal(fixture.testGroups[0].tests[0].sk, "aa");
  });
});

describe("main", () => {
  const projection = JSON.stringify({
    algorithm: "A",
    mode: "m",
    revision: "r",
    testGroups: [{ ...GROUP, tgId: 1, tests: cases(6) }],
  });

  it("writes one formatted fixture per set", async () => {
    const out = mkdtempSync(join(tmpdir(), "acvp-"));
    const urls = [];
    const logs = [];
    const fetchImpl = async (url) => (urls.push(url), new Response(projection));
    assert.equal(
      await main([], { out, fetchImpl, log: (m) => logs.push(m) }),
      0,
    );
    assert.equal(urls.length, SETS.length);
    assert.match(
      urls[0],
      /^https:\/\/raw\.githubusercontent\.com\/usnistgov\/ACVP-Server\/[0-9a-f]{40}\/gen-val\/json-files\/ML-KEM-keyGen-FIPS203\/internalProjection\.json$/,
    );
    assert.equal(
      logs[0],
      "acvp-vectors: ML-KEM-keyGen-FIPS203: 1 groups, 3 cases",
    );
    const written = readFileSync(
      join(out, "ML-DSA-sigVer-FIPS204.json"),
      "utf8",
    );
    assert.match(written, /^\{\n {2}"source": /);
    assert.equal(JSON.parse(written).testGroups[0].tests.length, 5);
  });
  it("stops at the first HTTP error", async () => {
    const out = mkdtempSync(join(tmpdir(), "acvp-"));
    const fetchImpl = async () => new Response("", { status: 503 });
    await assert.rejects(
      main([], { out, fetchImpl }),
      /^Error: ML-KEM-keyGen-FIPS203: HTTP 503$/,
    );
  });
});
