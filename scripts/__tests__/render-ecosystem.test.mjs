// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { main, render, replaceBlock, row } from "../render-ecosystem.mjs";

const ECOSYSTEM = JSON.parse(
  readFileSync(new URL("../../docs/ecosystem.json", import.meta.url), "utf8"),
);
const member = (name) => ECOSYSTEM.members.find((m) => m.name === name);

describe("row", () => {
  it("links the repository and the registry page", () => {
    assert.equal(
      row(member("crypto-service-sdk-python"), "o"),
      "| [`crypto-service-sdk-python`](https://github.com/o/crypto-service-sdk-python) | Python | " +
        `${member("crypto-service-sdk-python").purpose} | [PyPI](https://pypi.org/project/crypto-service-sdk-python/) \`crypto-service-sdk-python\` |`,
    );
    assert.match(
      row(member("crypto-service-sdk-java"), "o"),
      /\[Maven Central\]\(https:\/\/central\.sonatype\.com\/artifact\/co\.crypto-service\/crypto-service-sdk\)/,
    );
  });
  it("names the site's registry without a package id", () => {
    assert.match(
      row(member("crypto-service.github.io"), "o"),
      /\| None \(website\) \|$/,
    );
  });
});

describe("render", () => {
  it("lists every member outside this repository, in inventory order", () => {
    const block = render(ECOSYSTEM);
    const names = [...block.matchAll(/\[`([^`]+)`\]\(https:\/\/github/g)].map(
      (m) => m[1],
    );
    assert.deepEqual(
      names,
      ECOSYSTEM.members.filter((m) => m.kind !== "core").map((m) => m.name),
    );
    assert.ok(block.startsWith("<!-- ecosystem:start -->"));
    assert.ok(block.endsWith("<!-- ecosystem:end -->"));
  });
});

describe("replaceBlock", () => {
  it("replaces only the marked block", () => {
    const readme =
      "a\n<!-- ecosystem:start -->\nold\n<!-- ecosystem:end -->\nb\n";
    assert.equal(replaceBlock(readme, "NEW"), "a\nNEW\nb\n");
  });
  it("refuses a README without markers", () => {
    assert.throws(
      () => replaceBlock("no markers", "x"),
      /no ecosystem markers/,
    );
    assert.throws(
      () =>
        replaceBlock("<!-- ecosystem:end -->\n<!-- ecosystem:start -->", "x"),
      /no ecosystem markers/,
    );
  });
  it("keeps README.md in sync with docs/ecosystem.json", () => {
    const readme = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf8",
    );
    assert.equal(replaceBlock(readme, render(ECOSYSTEM)), readme);
  });
});

describe("main", () => {
  const STALE = "a\n<!-- ecosystem:start -->\nold\n<!-- ecosystem:end -->\n";

  function tree() {
    const root = `${mkdtempSync(join(tmpdir(), "render-ecosystem-"))}/`;
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, "docs/ecosystem.json"), JSON.stringify(ECOSYSTEM));
    writeFileSync(join(root, "README.md"), STALE);
    return root;
  }
  function capture() {
    const out = { logs: [], errors: [] };
    out.log = (m) => out.logs.push(m);
    out.error = (m) => out.errors.push(m);
    return out;
  }

  it("--check fails on a stale README and leaves it alone", () => {
    const root = tree();
    const out = capture();
    assert.equal(main(["--check"], { root, ...out }), 1);
    assert.match(out.errors[0], /README\.md is out of date/);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), STALE);
  });
  it("rewrites the block silently, after which --check passes", () => {
    const root = tree();
    const out = capture();
    assert.equal(main([], { root, ...out }), 0);
    assert.deepEqual(out.logs, []);
    assert.equal(
      readFileSync(join(root, "README.md"), "utf8"),
      `a\n${render(ECOSYSTEM)}\n`,
    );
    assert.equal(main(["--check"], { root, ...out }), 0);
    assert.deepEqual(out.logs, ["render-ecosystem: ok"]);
  });
});
