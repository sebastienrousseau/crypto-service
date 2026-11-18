// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { main, problem, publicNames } from "../check-provenance.mjs";

const REGISTRY = "https://registry.npmjs.org/";
const PROVEN = { dist: { attestations: { provenance: {} } } };

/** A fake registry: `docs[name]` is the packument, or a status code. */
function registry(docs) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const doc = docs[decodeURIComponent(url.slice(REGISTRY.length))];
    if (typeof doc === "number") return new Response("", { status: doc });
    return new Response(JSON.stringify(doc), { status: 200 });
  };
  return { fetchImpl, calls };
}

function tree() {
  const root = `${mkdtempSync(join(tmpdir(), "provenance-"))}/`;
  const add = (dir, pkg) => {
    mkdirSync(join(root, "packages", dir), { recursive: true });
    writeFileSync(join(root, "packages", dir, "package.json"), pkg);
  };
  add("crypto-a", `{"name": "@s/a"}`);
  add("crypto-b", `{"name": "@s/b", "private": true}`);
  mkdirSync(join(root, "packages/other"));
  return root;
}

function capture() {
  const out = { logs: [], errors: [] };
  out.log = (m) => out.logs.push(m);
  out.error = (m) => out.errors.push(m);
  return out;
}

describe("publicNames", () => {
  it("lists only public crypto-* packages", () => {
    assert.deepEqual(publicNames(tree()), ["@s/a"]);
  });
});

describe("problem", () => {
  it("passes a version with a provenance attestation", async () => {
    const { fetchImpl, calls } = registry({
      "@s/a": { versions: { "1.0.0": PROVEN } },
    });
    assert.equal(await problem("@s/a", "1.0.0", fetchImpl), undefined);
    assert.equal(calls[0].url, `${REGISTRY}%40s%2Fa`);
    assert.equal(calls[0].init.headers["cache-control"], "no-cache");
  });
  it("names each way the package can fall short", async () => {
    const { fetchImpl } = registry({
      "@s/gone": 404,
      "@s/none": {},
      "@s/old": { versions: { "0.9.0": PROVEN } },
      "@s/bare": { versions: { "1.0.0": {} } },
      "@s/plain": { versions: { "1.0.0": { dist: { attestations: {} } } } },
    });
    const of = (name) => problem(name, "1.0.0", fetchImpl);
    assert.equal(await of("@s/gone"), "@s/gone: registry returned 404");
    assert.equal(await of("@s/none"), "@s/none@1.0.0: not on npm");
    assert.equal(await of("@s/old"), "@s/old@1.0.0: not on npm");
    assert.equal(
      await of("@s/bare"),
      "@s/bare@1.0.0: no provenance attestation",
    );
    assert.equal(
      await of("@s/plain"),
      "@s/plain@1.0.0: no provenance attestation",
    );
  });
});

describe("main", () => {
  it("needs a version", async () => {
    const out = capture();
    assert.equal(await main([], out), 2);
    assert.deepEqual(out.errors, ["usage: check-provenance.mjs <version>"]);
  });
  it("passes when every public package is attested", async () => {
    const out = capture();
    const { fetchImpl } = registry({
      "@s/a": { versions: { "1.0.0": PROVEN } },
    });
    const code = await main(["1.0.0"], { root: tree(), fetchImpl, ...out });
    assert.equal(code, 0);
    assert.deepEqual(out.logs, ["provenance: ok (1 packages at 1.0.0)"]);
  });
  it("retries while the registry catches up", async () => {
    const out = capture();
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      const versions = calls < 3 ? {} : { "1.0.0": PROVEN };
      return new Response(JSON.stringify({ versions }), { status: 200 });
    };
    const options = { root: tree(), fetchImpl, retryMs: 0, ...out };
    assert.equal(await main(["1.0.0"], options), 0);
    assert.equal(calls, 3);
    assert.match(out.logs[0], /^provenance: attempt 1\/24 - 1 package\(s\)/);
    assert.equal(out.logs.length, 3);
  });
  it("fails after the last attempt", async () => {
    const out = capture();
    const { fetchImpl, calls } = registry({ "@s/a": 500 });
    const options = { root: tree(), fetchImpl, retryMs: 0, ...out };
    assert.equal(await main(["1.0.0"], options), 1);
    assert.equal(calls.length, 24);
    assert.equal(out.logs.length, 23);
    assert.deepEqual(out.errors, [
      "provenance: audit failed",
      "  @s/a: registry returned 500",
    ]);
  });
});
