// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkLengths, main, parseVectors } from "../xwing-vectors.mjs";

/** Hex length of each field. */
const HEX = { seed: 64, sk: 64, pk: 2432, eseed: 128, ct: 2240, ss: 64 };

/** A vector whose every field repeats one hex digit. */
const vector = (digit) =>
  Object.fromEntries(
    Object.entries(HEX).map(([name, n]) => [name, digit.repeat(n)]),
  );

/** `name value` lines, wrapped at 64 columns as the draft wraps them. */
function lines(v) {
  return Object.entries(v).flatMap(([name, hex]) => {
    const [first, ...rest] = hex.match(/.{1,64}/g);
    // pk starts on its own line; every other field on the name's line.
    const head = name === "pk" ? [name, `   ${first}`] : [`${name} ${first}`];
    return [...head, ...rest.map((chunk) => `   ${chunk}`)];
  });
}

/** Draft text: contents, Appendix C with page breaks, then more text. */
function draft(...vectors) {
  const body = vectors.flatMap((v) => ["", ...lines(v)]);
  // A page break inside the first vector's pk.
  body.splice(
    10,
    0,
    "Connolly, et al.  Expires 1 May  [Page 40]",
    "\f",
    "Internet-Draft  X-Wing",
  );
  return [
    "Table of Contents",
    "Appendix C.  Test Vectors",
    "",
    "Appendix C.  Test Vectors",
    ...body,
    "unknown 00",
    "   abcdef",
    "Authors' Addresses",
    "   0123",
    "",
  ].join("\n");
}

describe("parseVectors", () => {
  it("joins wrapped values across page breaks", () => {
    assert.deepEqual(parseVectors(draft(vector("a"), vector("b"))), [
      vector("a"),
      vector("b"),
    ]);
  });
  it("refuses a field of the wrong length", () => {
    const short = { ...vector("a"), ct: "ab" };
    assert.throws(
      () => parseVectors(draft(short)),
      /^Error: vector field ct: expected 1120 bytes$/,
    );
  });
});

describe("checkLengths", () => {
  it("refuses a missing field", () => {
    const { ss, ...partial } = vector("a");
    assert.equal(ss.length, 64);
    assert.throws(() => checkLengths(partial), /field ss: expected 32 bytes/);
  });
});

describe("main", () => {
  it("writes the vectors of a draft with the expected hash", async () => {
    const text = draft(vector("c"));
    const sha256 = createHash("sha256").update(text).digest("hex");
    const file = join(mkdtempSync(join(tmpdir(), "xwing-")), "v/x.json");
    let url;
    const fetchImpl = async (u) => ((url = u), new Response(text));
    const logs = [];
    const options = { file, sha256, fetchImpl, log: (m) => logs.push(m) };
    assert.equal(await main([], options), 0);
    assert.equal(
      url,
      "https://www.ietf.org/archive/id/draft-connolly-cfrg-xwing-kem-06.txt",
    );
    assert.deepEqual(logs, ["xwing-vectors: 1 vectors"]);
    const fixture = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(fixture.section, "Appendix C");
    assert.equal(fixture.generatedBy, "scripts/xwing-vectors.mjs");
    assert.match(fixture.sha256, /^318cae42/);
    assert.deepEqual(fixture.vectors, [vector("c")]);
  });
  it("refuses a draft that does not match the pinned hash", async () => {
    const fetchImpl = async () => new Response("changed");
    await assert.rejects(main([], { fetchImpl }), /draft text changed/);
  });
});
