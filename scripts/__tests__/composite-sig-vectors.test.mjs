// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fixtureOf, main, parseAppendix } from "../composite-sig-vectors.mjs";

const test = (tcId) => ({
  tcId,
  pk: `${tcId}-pk`,
  x5c: "dropped",
  sk: "c2s=",
  sk_pkcs8: "dropped",
  s: "c2ln",
  sWithContext: "c2ln",
});
const APPENDIX = {
  m: "bWVzc2FnZQ==",
  ctx: "Y3R4",
  tests: [
    test("id-MLDSA44-Ed25519-SHA512"),
    test("id-MLDSA87-ECDSA-P384-SHA512"),
    test("id-MLDSA65-Ed25519-SHA512"),
  ],
};

/** The appendix as the draft prints it: wrapped at 72, with page breaks. */
function draft(appendix = APPENDIX) {
  const json = JSON.stringify(appendix).match(/.{1,40}/g);
  return [
    "Table of Contents",
    "Appendix E.  Test Vectors",
    "Appendix F.  Intellectual Property",
    "",
    "Appendix E.  Test Vectors",
    "",
    "   {",
    ...json.slice(0, 3).map((l) => `   ${l}`),
    "Ounsworth, et al.        Expires 1 May 2027             [Page 90]",
    "\f",
    "Internet-Draft        Composite ML-DSA              October 2026",
    ...json.slice(3).map((l) => `   ${l}`),
    "",
    "Appendix F.  Intellectual Property",
    "",
  ]
    .join("\n")
    .replace("   {\n   {", "   {\n   ");
}

describe("parseAppendix", () => {
  it("restores the appendix's JSON across wraps and page breaks", () => {
    assert.deepEqual(parseAppendix(draft()), APPENDIX);
  });
});

describe("fixtureOf", () => {
  it("keeps the wanted cases and their fields, in draft order", () => {
    const fixture = fixtureOf(APPENDIX);
    assert.deepEqual(
      fixture.tests.map((t) => t.tcId),
      ["id-MLDSA44-Ed25519-SHA512", "id-MLDSA65-Ed25519-SHA512"],
    );
    assert.deepEqual(Object.keys(fixture.tests[0]), [
      "tcId",
      "pk",
      "sk",
      "s",
      "sWithContext",
    ]);
    assert.equal(fixture.m, APPENDIX.m);
    assert.equal(fixture.ctx, APPENDIX.ctx);
    assert.equal(fixture.encoding, "base64");
  });
  it("refuses an appendix missing a wanted case", () => {
    const appendix = { ...APPENDIX, tests: APPENDIX.tests.slice(0, 2) };
    assert.throws(
      () => fixtureOf(appendix),
      /^Error: expected 2 test cases, found 1$/,
    );
  });
});

describe("main", () => {
  it("writes the fixture from a draft with the expected hash", async () => {
    const text = draft();
    const sha256 = createHash("sha256").update(text).digest("hex");
    const file = join(mkdtempSync(join(tmpdir(), "composite-")), "c/x.json");
    let url;
    const fetchImpl = async (u) => ((url = u), new Response(text));
    const logs = [];
    const options = { file, sha256, fetchImpl, log: (m) => logs.push(m) };
    assert.equal(await main([], options), 0);
    assert.equal(
      url,
      "https://www.ietf.org/archive/id/draft-ietf-lamps-pq-composite-sigs-19.txt",
    );
    assert.deepEqual(logs, [
      "composite-sig-vectors: id-MLDSA44-Ed25519-SHA512, id-MLDSA65-Ed25519-SHA512",
    ]);
    assert.deepEqual(
      JSON.parse(readFileSync(file, "utf8")),
      fixtureOf(APPENDIX),
    );
  });
  it("refuses a draft that does not match the pinned hash", async () => {
    const fetchImpl = async () => new Response("changed");
    await assert.rejects(main([], { fetchImpl }), /draft text changed/);
  });
});
